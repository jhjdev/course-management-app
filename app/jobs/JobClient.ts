import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { JobManager } from './JobManager';
import { JobPriority, JobStatus, JobType, JobData, JobResult, JobOptions } from './types';

/**
* Options for job submission
*/
interface SubmitOptions<T extends JobData> {
priority?: JobPriority;
delay?: number;
attempts?: number;
timeout?: number;
jobId?: string;
removeOnComplete?: boolean;
data: T;
}

/**
* Client for interacting with the job system
*/
export class JobClient extends EventEmitter {
private static instance: JobClient;
private manager: JobManager;
private logger: Logger;

private constructor() {
    super();
    this.manager = JobManager.getInstance();
    this.logger = Logger.getInstance();
}

/**
* Gets the singleton instance of JobClient
*/
public static getInstance(): JobClient {
    if (!JobClient.instance) {
    JobClient.instance = new JobClient();
    }
    return JobClient.instance;
}

/**
* Submits a new job to the queue
* @param type The type of job to create
* @param options Job submission options
* @returns Promise resolving to the job ID
*/
public async submit<T extends JobData>(
    type: JobType,
    options: SubmitOptions<T>
): Promise<string> {
    try {
    const jobId = await this.manager.createJob(type, {
        ...options,
        priority: options.priority || JobPriority.NORMAL,
        attempts: options.attempts || 3,
    });
    
    this.logger.info('Job submitted successfully', { jobId, type });
    return jobId;
    } catch (error) {
    this.logger.error('Failed to submit job', { error, type });
    throw error;
    }
}

/**
* Submits multiple jobs as a batch
* @param jobs Array of job submissions
* @returns Promise resolving to array of job IDs
*/
public async submitBatch<T extends JobData>(
    jobs: Array<{ type: JobType; options: SubmitOptions<T> }>
): Promise<string[]> {
    try {
    const jobIds = await this.manager.createJobs(
        jobs.map(job => ({
        type: job.type,
        options: {
            ...job.options,
            priority: job.options.priority || JobPriority.NORMAL,
            attempts: job.options.attempts || 3,
        }
        }))
    );
    
    this.logger.info('Batch jobs submitted successfully', { count: jobs.length });
    return jobIds;
    } catch (error) {
    this.logger.error('Failed to submit batch jobs', { error });
    throw error;
    }
}

/**
* Gets the current status of a job
* @param jobId The ID of the job to check
* @returns Promise resolving to the job status
*/
public async getStatus(jobId: string): Promise<JobStatus> {
    return this.manager.getJobStatus(jobId);
}

/**
* Gets the result of a completed job
* @param jobId The ID of the job to get results for
* @returns Promise resolving to the job result
*/
public async getResult<T extends JobResult>(jobId: string): Promise<T> {
    return this.manager.getJobResult<T>(jobId);
}

/**
* Cancels a job
* @param jobId The ID of the job to cancel
*/
public async cancel(jobId: string): Promise<void> {
    await this.manager.removeJob(jobId);
    this.logger.info('Job cancelled successfully', { jobId });
}

/**
* Retries a failed job
* @param jobId The ID of the job to retry
* @param options Optional retry options
*/
public async retry(
    jobId: string,
    options?: { attempts?: number; delay?: number }
): Promise<void> {
    await this.manager.retryJob(jobId, options);
    this.logger.info('Job retry initiated', { jobId, options });
}

/**
* Gets the progress of a job
* @param jobId The ID of the job to check progress for
* @returns Promise resolving to progress percentage
*/
public async getProgress(jobId: string): Promise<number> {
    return this.manager.getJobProgress(jobId);
}

/**
* Subscribes to job events
* @param jobId The ID of the job to subscribe to
* @param callback Callback function for job events
*/
public subscribe(
    jobId: string,
    callback: (event: string, data: any) => void
): void {
    this.manager.subscribeToJob(jobId, callback);
}

/**
* Unsubscribes from job events
* @param jobId The ID of the job to unsubscribe from
*/
public unsubscribe(jobId: string): void {
    this.manager.unsubscribeFromJob(jobId);
}

/**
* Lists all jobs matching the given criteria
* @param options Filter and pagination options
* @returns Promise resolving to array of job info
*/
public async list(options?: {
    status?: JobStatus;
    type?: JobType;
    skip?: number;
    limit?: number;
}): Promise<Array<{
    id: string;
    type: JobType;
    status: JobStatus;
    progress: number;
    createdAt: Date;
}>> {
    return this.manager.listJobs(options);
}

/**
* Cleans up completed and failed jobs
* @param olderThan Optional age threshold for cleanup
*/
public async cleanup(olderThan?: Date): Promise<void> {
    await this.manager.cleanupJobs(olderThan);
    this.logger.info('Job cleanup completed', { olderThan });
}
}

