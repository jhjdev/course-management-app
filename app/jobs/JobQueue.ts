import Bull, { Queue, Job, JobOptions } from 'bull';
import { Logger } from '../utils/logger';
import { JobType, JobData, JobResult, JobPriority, QueueMetrics } from './types';

/**
* Configuration options for the JobQueue
*/
interface JobQueueConfig {
/** Redis connection string */
redis: string;
/** Default job options */
defaultJobOptions?: JobOptions;
/** Maximum number of concurrent jobs */
concurrency?: number;
}

/**
* Manages background job processing using Bull queue
* Handles job creation, monitoring, and lifecycle management
*/
export class JobQueue {
private queues: Map<JobType, Queue>;
private readonly defaultConfig: JobOptions;
private metrics: QueueMetrics;
private isShuttingDown: boolean;

constructor(private config: JobQueueConfig) {
    this.queues = new Map();
    this.metrics = {
    processed: 0,
    failed: 0,
    delayed: 0,
    active: 0
    };
    this.isShuttingDown = false;
    this.defaultConfig = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000
    },
    removeOnComplete: true,
    ...config.defaultJobOptions
    };

    // Initialize queues for each job type
    Object.values(JobType).forEach(type => {
    this.initializeQueue(type);
    });
}

/**
* Initializes a Bull queue for the given job type
*/
private initializeQueue(type: JobType): void {
    const queue = new Bull(type, this.config.redis, {
    defaultJobOptions: this.defaultConfig
    });

    // Set up event handlers
    queue.on('completed', (job) => {
    Logger.info(`Job ${job.id} of type ${type} completed successfully`);
    this.metrics.processed++;
    });

    queue.on('failed', (job, error) => {
    Logger.error(`Job ${job.id} of type ${type} failed: ${error.message}`, {
        error,
        jobId: job.id,
        jobType: type
    });
    this.metrics.failed++;
    });

    queue.on('stalled', (job) => {
    Logger.warn(`Job ${job.id} of type ${type} stalled`);
    });

    queue.on('error', (error) => {
    Logger.error(`Queue ${type} error: ${error.message}`, { error });
    });

    this.queues.set(type, queue);
}

/**
* Adds a new job to the queue
*/
async addJob<T extends JobData>(
    type: JobType,
    data: T,
    options: Partial<JobOptions> = {}
): Promise<Job<T>> {
    if (this.isShuttingDown) {
    throw new Error('Queue is shutting down, not accepting new jobs');
    }

    const queue = this.queues.get(type);
    if (!queue) {
    throw new Error(`Queue for job type ${type} not found`);
    }

    try {
    const job = await queue.add(data, {
        ...this.defaultConfig,
        ...options
    });

    Logger.info(`Added job ${job.id} to queue ${type}`);
    return job;
    } catch (error) {
    Logger.error(`Failed to add job to queue ${type}`, { error, data });
    throw error;
    }
}

/**
* Adds a job with high priority
*/
async addPriorityJob<T extends JobData>(
    type: JobType,
    data: T,
    priority: JobPriority
): Promise<Job<T>> {
    return this.addJob(type, data, { priority });
}

/**
* Gets the status of a specific job
*/
async getJobStatus<T extends JobData>(
    type: JobType,
    jobId: string
): Promise<Job<T> | null> {
    const queue = this.queues.get(type);
    if (!queue) {
    throw new Error(`Queue for job type ${type} not found`);
    }

    return queue.getJob(jobId);
}

/**
* Pauses a specific queue
*/
async pauseQueue(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    if (!queue) {
    throw new Error(`Queue for job type ${type} not found`);
    }

    await queue.pause();
    Logger.info(`Paused queue ${type}`);
}

/**
* Resumes a specific queue
*/
async resumeQueue(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    if (!queue) {
    throw new Error(`Queue for job type ${type} not found`);
    }

    await queue.resume();
    Logger.info(`Resumed queue ${type}`);
}

/**
* Retries a failed job
*/
async retryJob(type: JobType, jobId: string): Promise<void> {
    const queue = this.queues.get(type);
    if (!queue) {
    throw new Error(`Queue for job type ${type} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${type}`);
    }

    await job.retry();
    Logger.info(`Retried job ${jobId} in queue ${type}`);
}

/**
* Removes a job from the queue
*/
async removeJob(type: JobType, jobId: string): Promise<void> {
    const queue = this.queues.get(type);
    if (!queue) {
    throw new Error(`Queue for job type ${type} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${type}`);
    }

    await job.remove();
    Logger.info(`Removed job ${jobId} from queue ${type}`);
}

/**
* Gets current metrics for all queues
*/
async getMetrics(): Promise<QueueMetrics> {
    const metrics = { ...this.metrics };
    
    for (const [type, queue] of this.queues) {
    const counts = await queue.getJobCounts();
    metrics.active += counts.active;
    metrics.delayed += counts.delayed;
    }

    return metrics;
}

/**
* Gracefully shuts down all queues
*/
async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    Logger.info('Initiating job queue shutdown');

    try {
    for (const [type, queue] of this.queues) {
        await queue.pause();
        await queue.close();
        Logger.info(`Closed queue ${type}`);
    }
    } catch (error) {
    Logger.error('Error during queue shutdown', { error });
    throw error;
    }
}

/**
* Cleans up completed and failed jobs older than the specified threshold
*/
async cleanup(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    for (const [type, queue] of this.queues) {
    try {
        await queue.clean(olderThan, 'completed');
        await queue.clean(olderThan, 'failed');
        Logger.info(`Cleaned up old jobs in queue ${type}`);
    } catch (error) {
        Logger.error(`Failed to clean queue ${type}`, { error });
    }
    }
}
}

