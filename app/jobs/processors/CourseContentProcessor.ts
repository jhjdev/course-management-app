import { Job } from 'bull';
import { Logger } from '../../utils/logger';
import { ContentType, ProcessingStatus } from '../types';
import { createThumbnail } from '../../utils/media';
import { extractMetadata } from '../../utils/metadata';
import { validateContent } from '../../utils/validation';
import { sanitizeFilename } from '../../utils/security';
import { VideoProcessor } from './content/VideoProcessor';
import { DocumentProcessor } from './content/DocumentProcessor';
import { QuizProcessor } from './content/QuizProcessor';
import { CourseService } from '../../services/CourseService';
import { SearchService } from '../../services/SearchService';
import path from 'path';
import fs from 'fs/promises';

interface ContentProcessingJob {
courseId: string;
contentId: string;
contentType: ContentType;
filePath: string;
version: number;
metadata?: Record<string, any>;
}

interface ProcessingResult {
status: ProcessingStatus;
metadata: Record<string, any>;
searchableContent: string;
thumbnailPath?: string;
outputPath: string;
error?: string;
}

export class CourseContentProcessor {
private readonly logger = new Logger('CourseContentProcessor');
private readonly courseService = new CourseService();
private readonly searchService = new SearchService();
private readonly processors = {
    [ContentType.VIDEO]: new VideoProcessor(),
    [ContentType.DOCUMENT]: new DocumentProcessor(),
    [ContentType.QUIZ]: new QuizProcessor(),
};

async process(job: Job<ContentProcessingJob>): Promise<ProcessingResult> {
    const { courseId, contentId, contentType, filePath, version, metadata } = job.data;
    this.logger.info(`Starting content processing for ${contentId} of type ${contentType}`);

    try {
    // Initial validation
    await this.validateInput(job.data);
    job.progress(10);

    // Create working directory
    const workDir = await this.createWorkingDirectory(contentId, version);
    job.progress(20);

    // Process content based on type
    const processor = this.processors[contentType];
    if (!processor) {
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Extract metadata
    const extractedMetadata = await extractMetadata(filePath);
    job.progress(30);

    // Process content
    const processingResult = await processor.process({
        filePath,
        workDir,
        metadata: { ...metadata, ...extractedMetadata },
    });
    job.progress(50);

    // Generate thumbnail if applicable
    let thumbnailPath: string | undefined;
    if (contentType === ContentType.VIDEO) {
        thumbnailPath = await this.generateThumbnail(filePath, workDir);
    }
    job.progress(60);

    // Create searchable content
    const searchableContent = await this.createSearchableContent(
        processingResult.outputPath,
        contentType
    );
    job.progress(70);

    // Validate processed content
    await this.validateProcessedContent(processingResult.outputPath);
    job.progress(80);

    // Update course status
    await this.updateCourseStatus(courseId, contentId, {
        status: ProcessingStatus.COMPLETED,
        version,
        metadata: processingResult.metadata,
    });
    job.progress(90);

    // Index content for search
    await this.indexContent(courseId, contentId, searchableContent);
    job.progress(100);

    return {
        status: ProcessingStatus.COMPLETED,
        metadata: processingResult.metadata,
        searchableContent,
        thumbnailPath,
        outputPath: processingResult.outputPath,
    };

    } catch (error) {
    this.logger.error(`Processing failed for ${contentId}:`, error);
    await this.handleProcessingError(courseId, contentId, error);
    throw error;
    } finally {
    await this.cleanup(job.data);
    }
}

private async validateInput(data: ContentProcessingJob): Promise<void> {
    const { filePath, contentType } = data;
    
    if (!await validateContent(filePath, contentType)) {
    throw new Error(`Invalid content: ${filePath}`);
    }
}

private async createWorkingDirectory(contentId: string, version: number): Promise<string> {
    const workDir = path.join(process.env.PROCESSING_DIR!, sanitizeFilename(contentId), String(version));
    await fs.mkdir(workDir, { recursive: true });
    return workDir;
}

private async generateThumbnail(filePath: string, workDir: string): Promise<string> {
    return createThumbnail(filePath, workDir);
}

private async createSearchableContent(filePath: string, contentType: ContentType): Promise<string> {
    const processor = this.processors[contentType];
    return processor.extractText(filePath);
}

private async validateProcessedContent(outputPath: string): Promise<void> {
    // Implement content validation logic
    if (!await fs.stat(outputPath)) {
    throw new Error(`Processed content not found at ${outputPath}`);
    }
}

private async updateCourseStatus(courseId: string, contentId: string, status: any): Promise<void> {
    await this.courseService.updateContentStatus(courseId, contentId, status);
}

private async indexContent(courseId: string, contentId: string, content: string): Promise<void> {
    await this.searchService.indexContent(courseId, contentId, content);
}

private async handleProcessingError(courseId: string, contentId: string, error: any): Promise<void> {
    await this.courseService.updateContentStatus(courseId, contentId, {
    status: ProcessingStatus.FAILED,
    error: error.message,
    });
}

private async cleanup(data: ContentProcessingJob): Promise<void> {
    try {
    // Cleanup temporary processing files
    const tmpDir = path.join(process.env.PROCESSING_DIR!, sanitizeFilename(data.contentId));
    await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
    this.logger.error('Cleanup failed:', error);
    }
}
}

