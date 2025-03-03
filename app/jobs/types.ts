/**
* Enum defining different types of background jobs in the system
*/
export enum JobType {
EMAIL_NOTIFICATION = 'EMAIL_NOTIFICATION',
COURSE_PROCESSING = 'COURSE_PROCESSING',
PROGRESS_UPDATE = 'PROGRESS_UPDATE',
REPORT_GENERATION = 'REPORT_GENERATION',
CACHE_WARMING = 'CACHE_WARMING',
DATA_CLEANUP = 'DATA_CLEANUP',
ANALYTICS_PROCESSING = 'ANALYTICS_PROCESSING',
CONTENT_INDEXING = 'CONTENT_INDEXING'
}

/**
* Enum defining priority levels for jobs
*/
export enum JobPriority {
LOW = 1,
NORMAL = 2,
HIGH = 3,
CRITICAL = 4
}

/**
* Interface for job status information
*/
export interface JobStatus {
state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
progress: number;
attempts: number;
failedReason?: string;
processedOn?: Date;
finishedOn?: Date;
}

/**
* Generic interface for job data
*/
export interface JobData<T = unknown> {
type: JobType;
payload: T;
userId?: string;
metadata?: Record<string, unknown>;
}

/**
* Generic interface for job results
*/
export interface JobResult<T = unknown> {
success: boolean;
data?: T;
error?: Error;
duration: number;
}

/**
* Interface for job options
*/
export interface JobOptions {
priority?: JobPriority;
attempts?: number;
backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
};
timeout?: number;
removeOnComplete?: boolean;
removeOnFail?: boolean;
jobId?: string;
}

/**
* Interface for job processor functions
*/
export interface JobProcessor<T = unknown, R = unknown> {
(jobData: JobData<T>, jobId: string): Promise<JobResult<R>>;
}

/**
* Interface for queue metrics
*/
export interface QueueMetrics {
waiting: number;
active: number;
completed: number;
failed: number;
delayed: number;
paused: number;
}

/**
* Interface for queue events
*/
export interface QueueEvents {
onCompleted?: (jobId: string, result: JobResult) => void;
onFailed?: (jobId: string, error: Error) => void;
onProgress?: (jobId: string, progress: number) => void;
onStalled?: (jobId: string) => void;
}

/**
* Type for job progress update function
*/
export type JobProgressCallback = (progress: number) => Promise<void>;

/**
* Interface for job context passed to processors
*/
export interface JobContext {
updateProgress: JobProgressCallback;
logger: {
    info: (message: string, meta?: object) => void;
    error: (message: string, error?: Error) => void;
    warn: (message: string, meta?: object) => void;
    debug: (message: string, meta?: object) => void;
};
}

