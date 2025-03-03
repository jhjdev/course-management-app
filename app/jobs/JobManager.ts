import Bull, { Queue, Job, JobOptions } from 'bull';
import { logger } from '../utils/logger';
import { JobQueue } from './JobQueue';
import { JobType, JobData, JobStatus, JobSearchParams } from './types';
import { RedisConfig } from '../config/types';

export class JobManager {
private static instance: JobManager;
private jobQueue: JobQueue;
private isInitialized: boolean = false;
private shutdownInProgress: boolean = false;

private constructor() {}

/**
* Get the singleton instance of JobManager
*/
public static getInstance(): JobManager {
    if (!JobManager.instance) {
    JobManager.instance = new JobManager();
    }
    return JobManager.instance;
}

/**
* Initialize the job manager with Redis configuration
*/
public async initialize(config: RedisConfig): Promise<void> {
    try {
    if (this.isInitialized) {
        logger.warn('JobManager already initialized');
        return;
    }

    this.jobQueue = new JobQueue(config);
    await this.jobQueue.initialize();
    
    this.setupEventHandlers();
    this.startMaintenanceJob();
    
    this.isInitialized = true;
    logger.info('JobManager initialized successfully');
    } catch (error) {
    logger.error('Failed to initialize JobManager', error);
    throw error;
    }
}

/**
* Create a new job with the specified type and data
*/
public async createJob<T extends JobData>(
    type: JobType,
    data: T,
    options?: JobOptions
): Promise<Job<T>> {
    this.checkInitialized();
    
    try {
    const job = await this.jobQueue.addJob(type, data, options);
    logger.info(`Created job ${job.id} of type ${type}`);
    return job;
    } catch (error) {
    logger.error(`Failed to create job of type ${type}`, error);
    throw error;
    }
}

/**
* Schedule a job to run at a specific time
*/
public async scheduleJob<T extends JobData>(
    type: JobType,
    data: T,
    scheduledTime: Date,
    options?: JobOptions
): Promise<Job<T>> {
    this.checkInitialized();
    
    try {
    const delay = scheduledTime.getTime() - Date.now();
    const job = await this.jobQueue.addJob(type, data, {
        ...options,
        delay: Math.max(0, delay)
    });
    logger.info(`Scheduled job ${job.id} of type ${type} for ${scheduledTime}`);
    return job;
    } catch (error) {
    logger.error(`Failed to schedule job of type ${type}`, error);
    throw error;
    }
}

/**
* Create a recurring job with a cron schedule
*/
public async createRecurringJob<T extends JobData>(
    type: JobType,
    data: T,
    cronExpression: string,
    options?: JobOptions
): Promise<Job<T>> {
    this.checkInitialized();
    
    try {
    const job = await this.jobQueue.addJob(type, data, {
        ...options,
        repeat: { cron: cronExpression }
    });
    logger.info(`Created recurring job ${job.id} of type ${type} with schedule ${cronExpression}`);
    return job;
    } catch (error) {
    logger.error(`Failed to create recurring job of type ${type}`, error);
    throw error;
    }
}

/**
* Get the status of a specific job
*/
public async getJobStatus(jobId: string): Promise<JobStatus> {
    this.checkInitialized();
    
    try {
    const status = await this.jobQueue.getJobStatus(jobId);
    return status;
    } catch (error) {
    logger.error(`Failed to get status for job ${jobId}`, error);
    throw error;
    }
}

/**
* Search for jobs based on specified parameters
*/
public async searchJobs(params: JobSearchParams): Promise<Job[]> {
    this.checkInitialized();
    
    try {
    const jobs = await this.jobQueue.searchJobs(params);
    return jobs;
    } catch (error) {
    logger.error('Failed to search jobs', error);
    throw error;
    }
}

/**
* Remove a job from the queue
*/
public async removeJob(jobId: string): Promise<void> {
    this.checkInitialized();
    
    try {
    await this.jobQueue.removeJob(jobId);
    logger.info(`Removed job ${jobId}`);
    } catch (error) {
    logger.error(`Failed to remove job ${jobId}`, error);
    throw error;
    }
}

/**
* Perform health check on the job system
*/
public async healthCheck(): Promise<boolean> {
    this.checkInitialized();
    
    try {
    const isHealthy = await this.jobQueue.isHealthy();
    return isHealthy;
    } catch (error) {
    logger.error('Health check failed', error);
    return false;
    }
}

/**
* Gracefully shutdown the job manager
*/
public async shutdown(): Promise<void> {
    if (!this.isInitialized || this.shutdownInProgress) {
    return;
    }

    this.shutdownInProgress = true;
    try {
    logger.info('Starting graceful shutdown of JobManager');
    await this.jobQueue.shutdown();
    this.isInitialized = false;
    this.shutdownInProgress = false;
    logger.info('JobManager shutdown complete');
    } catch (error) {
    logger.error('Error during JobManager shutdown', error);
    throw error;
    }
}

/**
* Clean up old completed jobs
*/
public async cleanupOldJobs(olderThanDays: number): Promise<void> {
    this.checkInitialized();
    
    try {
    const timestamp = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    await this.jobQueue.removeOldJobs(timestamp);
    logger.info(`Cleaned up jobs older than ${olderThanDays} days`);
    } catch (error) {
    logger.error('Failed to cleanup old jobs', error);
    throw error;
    }
}

private checkInitialized(): void {
    if (!this.isInitialized) {
    throw new Error('JobManager not initialized');
    }
}

private setupEventHandlers(): void {
    this.jobQueue.on('error', (error: Error) => {
    logger.error('Job queue error:', error);
    });

    this.jobQueue.on('failed', (job: Job, error: Error) => {
    logger.error(`Job ${job.id} failed:`, error);
    });

    this.jobQueue.on('completed', (job: Job) => {
    logger.info(`Job ${job.id} completed successfully`);
    });
}

private startMaintenanceJob(): void {
    // Run maintenance job every day at midnight
    this.createRecurringJob(
    JobType.MAINTENANCE,
    { operation: 'cleanup' },
    '0 0 * * *'
    ).catch(error => {
    logger.error('Failed to start maintenance job', error);
    });
}
}

