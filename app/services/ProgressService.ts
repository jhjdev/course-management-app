import { Types } from 'mongoose';
import { Progress } from '../models/Progress';
import { Course } from '../models/Course';
import { User } from '../models/User';

interface ProgressStats {
completedSections: number;
totalSections: number;
completionPercentage: number;
lastAccessedAt: Date;
lastAccessedSection?: Types.ObjectId;
isCompleted: boolean;
completedAt?: Date;
}

interface CourseProgress {
courseId: Types.ObjectId;
stats: ProgressStats;
}

class ProgressServiceError extends Error {
constructor(message: string) {
    super(message);
    this.name = 'ProgressServiceError';
}
}

class ProgressService {
private static instance: ProgressService;
private constructor() {}

static getInstance(): ProgressService {
    if (!ProgressService.instance) {
    ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
}

/**
* Initializes progress tracking for a user starting a course
* @param userId - The ID of the user
* @param courseId - The ID of the course
* @throws {ProgressServiceError} If progress already exists or invalid input
*/
async initializeProgress(userId: Types.ObjectId, courseId: Types.ObjectId): Promise<Progress> {
    try {
    const existingProgress = await Progress.findOne({ user: userId, course: courseId });
    if (existingProgress) {
        throw new ProgressServiceError('Progress already exists for this course');
    }

    const course = await Course.findById(courseId);
    if (!course) {
        throw new ProgressServiceError('Course not found');
    }

    return await Progress.create({
        user: userId,
        course: courseId,
        completedSections: [],
        completionPercentage: 0,
        lastAccessedAt: new Date(),
    });
    } catch (error) {
    if (error instanceof ProgressServiceError) throw error;
    throw new ProgressServiceError(`Failed to initialize progress: ${error.message}`);
    }
}

/**
* Marks a section as complete or incomplete
* @param userId - The ID of the user
* @param courseId - The ID of the course
* @param sectionId - The ID of the section
* @param complete - Whether to mark as complete or incomplete
*/
async updateSectionProgress(
    userId: Types.ObjectId,
    courseId: Types.ObjectId,
    sectionId: Types.ObjectId,
    complete: boolean
): Promise<Progress> {
    try {
    const progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
        throw new ProgressServiceError('Progress not found');
    }

    if (complete) {
        if (!progress.completedSections.includes(sectionId)) {
        progress.completedSections.push(sectionId);
        }
    } else {
        progress.completedSections = progress.completedSections.filter(
        id => !id.equals(sectionId)
        );
    }

    await this.recalculateProgress(progress);
    return await progress.save();
    } catch (error) {
    throw new ProgressServiceError(`Failed to update section progress: ${error.message}`);
    }
}

/**
* Updates the last accessed section for a course
* @param userId - The ID of the user
* @param courseId - The ID of the course
* @param sectionId - The ID of the section
*/
async updateLastAccessedSection(
    userId: Types.ObjectId,
    courseId: Types.ObjectId,
    sectionId: Types.ObjectId
): Promise<Progress> {
    try {
    const progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
        throw new ProgressServiceError('Progress not found');
    }

    progress.lastAccessedSection = sectionId;
    progress.lastAccessedAt = new Date();
    return await progress.save();
    } catch (error) {
    throw new ProgressServiceError(`Failed to update last accessed section: ${error.message}`);
    }
}

/**
* Retrieves progress statistics for a specific course
* @param userId - The ID of the user
* @param courseId - The ID of the course
*/
async getProgressStats(userId: Types.ObjectId, courseId: Types.ObjectId): Promise<ProgressStats> {
    try {
    const progress = await Progress.findOne({ user: userId, course: courseId })
        .populate('course')
        .lean();

    if (!progress) {
        throw new ProgressServiceError('Progress not found');
    }

    return {
        completedSections: progress.completedSections.length,
        totalSections: (progress.course as any).sections.length,
        completionPercentage: progress.completionPercentage,
        lastAccessedAt: progress.lastAccessedAt,
        lastAccessedSection: progress.lastAccessedSection,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
    };
    } catch (error) {
    throw new ProgressServiceError(`Failed to get progress stats: ${error.message}`);
    }
}

/**
* Retrieves progress for all courses for a user
* @param userId - The ID of the user
*/
async getAllUserProgress(userId: Types.ObjectId): Promise<CourseProgress[]> {
    try {
    const allProgress = await Progress.find({ user: userId })
        .populate('course')
        .lean();

    return allProgress.map(progress => ({
        courseId: progress.course._id,
        stats: {
        completedSections: progress.completedSections.length,
        totalSections: (progress.course as any).sections.length,
        completionPercentage: progress.completionPercentage,
        lastAccessedAt: progress.lastAccessedAt,
        lastAccessedSection: progress.lastAccessedSection,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
        },
    }));
    } catch (error) {
    throw new ProgressServiceError(`Failed to get all user progress: ${error.message}`);
    }
}

/**
* Marks a course as completed
* @param userId - The ID of the user
* @param courseId - The ID of the course
*/
async markCourseCompleted(userId: Types.ObjectId, courseId: Types.ObjectId): Promise<Progress> {
    try {
    const progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
        throw new ProgressServiceError('Progress not found');
    }

    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.completionPercentage = 100;
    return await progress.save();
    } catch (error) {
    throw new ProgressServiceError(`Failed to mark course as completed: ${error.message}`);
    }
}

/**
* Internal method to recalculate progress percentage
* @private
*/
private async recalculateProgress(progress: any): Promise<void> {
    const course = await Course.findById(progress.course);
    if (!course) {
    throw new ProgressServiceError('Course not found');
    }

    const totalSections = course.sections.length;
    const completedSections = progress.completedSections.length;
    progress.completionPercentage = Math.round((completedSections / totalSections) * 100);

    if (progress.completionPercentage === 100 && !progress.isCompleted) {
    progress.isCompleted = true;
    progress.completedAt = new Date();
    } else if (progress.completionPercentage < 100 && progress.isCompleted) {
    progress.isCompleted = false;
    progress.completedAt = undefined;
    }
}
}

export default ProgressService;

