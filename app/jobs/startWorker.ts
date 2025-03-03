import cluster from 'cluster';
import os from 'os';
import { Worker } from './Worker';
import { Logger } from '../utils/logger';
import { MetricsService } from '../services/MetricsService';
import { HealthCheck } from '../utils/HealthCheck';
import { Redis } from 'ioredis';
import { Config } from '../config';

const logger = new Logger('WorkerManager');

class WorkerManager {
private workers: Map<number, cluster.Worker> = new Map();
private redis: Redis;
private metrics: MetricsService;
private health: HealthCheck;
private shuttingDown = false;

constructor() {
    this.validateConfig();
    this.setupRedis();
    this.setupMetrics();
    this.setupHealthCheck();
}

private validateConfig() {
    const requiredEnvVars = [
    'REDIS_URL',
    'METRICS_ENABLED',
    'LOG_LEVEL',
    'WORKER_CONCURRENCY',
    ];

    for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
    }
}

private setupRedis() {
    this.redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
    if (!this.shuttingDown) {
        this.handleRedisFailure();
    }
    });
}

private setupMetrics() {
    this.metrics = new MetricsService({
    enabled: process.env.METRICS_ENABLED === 'true',
    prefix: 'worker_',
    labels: { env: process.env.NODE_ENV || 'development' },
    });
}

private setupHealthCheck() {
    this.health = new HealthCheck({
    components: ['redis', 'worker'],
    interval: 30000,
    });

    this.health.onUnhealthy((component) => {
    logger.error(`Health check failed for component: ${component}`);
    if (component === 'redis' && !this.shuttingDown) {
        this.handleRedisFailure();
    }
    });
}

private handleRedisFailure() {
    logger.warn('Attempting to reconnect to Redis...');
    setTimeout(() => {
    this.setupRedis();
    }, 5000);
}

public async start() {
    try {
    if (cluster.isPrimary) {
        logger.info('Starting worker manager...');
        
        const numWorkers = parseInt(process.env.WORKER_CONCURRENCY!) || 
        Math.max(1, os.cpus().length - 1);

        logger.info(`Launching ${numWorkers} workers...`);

        // Fork workers
        for (let i = 0; i < numWorkers; i++) {
        this.createWorker();
        }

        this.setupPrimaryProcessHandlers();
    } else {
        // Worker process
        const worker = new Worker({
        redis: this.redis,
        metrics: this.metrics,
        logger,
        });

        await worker.start();
    }
    } catch (error) {
    logger.error('Failed to start worker manager:', error);
    throw error;
    }
}

private createWorker() {
    const worker = cluster.fork();
    this.workers.set(worker.id, worker);

    worker.on('exit', (code, signal) => {
    if (!this.shuttingDown) {
        logger.warn(`Worker ${worker.id} died. Starting a new worker...`);
        this.workers.delete(worker.id);
        this.createWorker();
    }
    });

    worker.on('message', (msg) => {
    if (msg.type === 'health') {
        this.health.updateWorkerStatus(worker.id, msg.status);
    }
    });
}

private setupPrimaryProcessHandlers() {
    // Graceful shutdown
    const shutdown = async (signal: string) => {
    if (this.shuttingDown) return;
    
    this.shuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new jobs
    for (const worker of this.workers.values()) {
        worker.send({ type: 'shutdown' });
    }

    // Wait for workers to finish
    const shutdownTimeout = setTimeout(() => {
        logger.warn('Shutdown timeout reached. Forcing exit...');
        process.exit(1);
    }, 30000);

    // Wait for all workers to exit
    let remainingWorkers = this.workers.size;
    for (const worker of this.workers.values()) {
        worker.on('exit', () => {
        remainingWorkers--;
        if (remainingWorkers === 0) {
            clearTimeout(shutdownTimeout);
            logger.info('All workers stopped. Shutting down...');
            process.exit(0);
        }
        });
        
        worker.disconnect();
    }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
    });
}
}

// Start the worker manager
if (require.main === module) {
const manager = new WorkerManager();
manager.start().catch((error) => {
    logger.error('Failed to start worker manager:', error);
    process.exit(1);
});
}

export { WorkerManager };

