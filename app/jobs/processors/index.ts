import { JobType, JobProcessor, JobContext } from '../types';
import { EmailProcessor } from './EmailProcessor';
import { CourseProcessor } from './CourseProcessor';
import { ProgressProcessor } from './ProgressProcessor';
import { logger } from '../../utils/logger';

// Map job types to their processors
export const processors: Record<JobType, JobProcessor> = {
[JobType.EMAIL]: new EmailProcessor(),
[JobType.COURSE]: new CourseProcessor(),
[JobType.PROGRESS]: new ProgressProcessor(),
};

// Common utilities for processors
export class ProcessorUtils {
static async updateProgress(context: JobContext, progress: number): Promise<void> {
    try {
    await context.progress(progress);
    logger.debug(`Job progress updated: ${progress}%`, { jobId: context.jobId });
    } catch (error) {
    logger.error('Failed to update job progress', { error, jobId: context.jobId });
    }
}

static async validateJobData<T>(data: T, schema: any): Promise<boolean> {
    // Add validation logic here
    return true;
}
}

// Register all processors with error handling
export async function registerProcessors(queue: any): Promise<void> {
try {
    Object.entries(processors).forEach(([type, processor]) => {
    queue.process(type, async (job: any, context: JobContext) => {
        logger.info(`Processing job of type ${type}`, { jobId: job.id });
        return processor.process(job.data, context);
    });
    });
    logger.info('All processors registered successfully');
} catch (error) {
    logger.error('Failed to register processors', { error });
    throw error;
}
}

