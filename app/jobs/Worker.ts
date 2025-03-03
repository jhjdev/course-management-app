import { Queue, Worker as BullWorker, QueueEvents, Processor } from 'bullmq';
import { RedisOptions } from 'ioredis';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { JobTypes, JobContext, ProcessorMap } from './types';
import { metrics } from '../utils/metrics';

interface WorkerConfig {
name: string;
concurrency: number;
maxConcurrency: number;
minConcurrency: number;
redis: RedisOptions;
stalledInterval: number;
gracefulShutdownTimeout: number;
}

interface WorkerMetrics {
jobsProcessed: number;
jobsFailed: number;
processingTime: number;
queueLength: number;
workersActive: number;
}

export class Worker extends EventEmitter {
private worker: BullWorker;
private queue: Queue;
private queueEvents: QueueEvents;
private metrics: WorkerMetrics;
private isShuttingDown: boolean;
private config: WorkerConfig;
private healthCheckInterval: NodeJS.Timeout;
private scaleInterval: NodeJS.Timeout;

constructor(config: WorkerConfig) {
    super();
    this.config = config;
    this.isShuttingDown = false;
    this.metrics = {
    jobsProcessed: 0,
    jobsFailed: 0,
    processingTime: 0,
    queueLength: 0,
    workersActive: 0
    };
}

async start(): Promise<void> {
    try {
    this.queue = new Queue(this.config.name, {
        connection: this.config.redis
    });

    this.queueEvents = new QueueEvents(this.config.name, {
        connection: this.config.redis
    });

    this.worker = new BullWorker(
        this.config.name,
        async (job) => {
        const startTime = Date.now();
        try {
            const processor = this.getProcessor(job.name as JobTypes);
            const context: JobContext = {
            job,
            logger: logger.child({ jobId: job.id }),
            progress: (progress: number) => job.updateProgress(progress)
            };
            
            await processor(job.data, context);
            
            this.metrics.jobsProcessed++;
            this.metrics.processingTime += Date.now() - startTime;
        } catch (error) {
            this.metrics.jobsFailed++;
            logger.error('Job processing failed', {
            jobId: job.id,
            error: error.message,
            stack: error.stack
            });
            throw error;
        }
        },
        {
        concurrency: this.config.concurrency,
        connection: this.config.redis
        }
    );

    this.setupEventHandlers();
    this.startHealthCheck();
    this.startAutoScaling();

    logger.info('Worker started', {
        name: this.config.name,
        concurrency: this.config.concurrency
    });
    } catch (error) {
    logger.error('Failed to start worker', {
        error: error.message,
        stack: error.stack
    });
    throw error;
    }
}

private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
    metrics.increment('jobs.completed');
    logger.info('Job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, error) => {
    metrics.increment('jobs.failed');
    logger.error('Job failed', {
        jobId: job?.id,
        error: error.message,
        stack: error.stack
    });
    });

    this.worker.on('error', (error) => {
    logger.error('Worker error', {
        error: error.message,
        stack: error.stack
    });
    });

    this.queueEvents.on('waiting', () => {
    this.updateQueueMetrics();
    });
}

private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
    try {
        const isHealthy = await this.checkHealth();
        if (!isHealthy && !this.isShuttingDown) {
        logger.warn('Worker unhealthy, attempting recovery');
        await this.recover();
        }
    } catch (error) {
        logger.error('Health check failed', {
        error: error.message
        });
    }
    }, 30000);
}

private startAutoScaling(): void {
    this.scaleInterval = setInterval(async () => {
    try {
        await this.adjustConcurrency();
    } catch (error) {
        logger.error('Auto-scaling failed', {
        error: error.message
        });
    }
    }, 60000);
}

private async adjustConcurrency(): Promise<void> {
    const waitingCount = await this.queue.getWaitingCount();
    const activeCount = await this.queue.getActiveCount();
    const currentConcurrency = this.worker.concurrency;

    if (waitingCount > activeCount && currentConcurrency < this.config.maxConcurrency) {
    const newConcurrency = Math.min(
        currentConcurrency + 1,
        this.config.maxConcurrency
    );
    await this.worker.setConcurrency(newConcurrency);
    logger.info('Increased worker concurrency', {
        old: currentConcurrency,
        new: newConcurrency
    });
    } else if (waitingCount === 0 && currentConcurrency > this.config.minConcurrency) {
    const newConcurrency = Math.max(
        currentConcurrency - 1,
        this.config.minConcurrency
    );
    await this.worker.setConcurrency(newConcurrency);
    logger.info('Decreased worker concurrency', {
        old: currentConcurrency,
        new: newConcurrency
    });
    }
}

private async checkHealth(): Promise<boolean> {
    try {
    const ping = await this.queue.client.ping();
    const isProcessing = await this.worker.isRunning();
    return ping === 'PONG' && isProcessing;
    } catch (error) {
    return false;
    }
}

private async recover(): Promise<void> {
    try {
    await this.worker.close();
    await this.start();
    logger.info('Worker recovered successfully');
    } catch (error) {
    logger.error('Worker recovery failed', {
        error: error.message,
        stack: error.stack
    });
    }
}

private async updateQueueMetrics(): Promise<void> {
    try {
    const [waiting, active, delayed, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getDelayedCount(),
        this.queue.getFailedCount()
    ]);

    metrics.gauge('queue.waiting', waiting);
    metrics.gauge('queue.active', active);
    metrics.gauge('queue.delayed', delayed);
    metrics.gauge('queue.failed', failed);

    this.metrics.queueLength = waiting + active + delayed;
    this.metrics.workersActive = active;
    } catch (error) {
    logger.error('Failed to update queue metrics', {
        error: error.message
    });
    }
}

private getProcessor(jobType: JobTypes): Processor {
    const processor = ProcessorMap[jobType];
    if (!processor) {
    throw new Error(`No processor found for job type: ${jobType}`);
    }
    return processor;
}

async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    logger.info('Worker shutting down');

    clearInterval(this.healthCheckInterval);
    clearInterval(this.scaleInterval);

    try {
    await Promise.race([
        this.worker.close(),
        new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Shutdown timeout')), 
        this.config.gracefulShutdownTimeout)
        )
    ]);

    await this.queue.disconnect();
    await this.queueEvents.disconnect();

    logger.info('Worker shutdown complete');
    this.emit('shutdown');
    } catch (error) {
    logger.error('Error during worker shutdown', {
        error: error.message,
        stack: error.stack
    });
    throw error;
    }
}

getMetrics(): WorkerMetrics {
    return { ...this.metrics };
}
}

