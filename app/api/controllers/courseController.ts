import { Request, Response } from 'express';
import { CourseService } from '../../services/CourseService';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { Course, CourseProgress, CourseAnalytics } from '../../types';

export class CourseController {
constructor(private courseService: CourseService) {}

getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const courses = await this.courseService.getAllCourses({
    page: Number(page),
    limit: Number(limit)
    });
    
    res.status(200).json({
    success: true,
    data: courses
    });
});

getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await this.courseService.getCourseById(id);
    
    if (!course) {
    throw new NotFoundError(`Course with id ${id} not found`);
    }

    res.status(200).json({
    success: true,
    data: course
    });
});

createCourse = asyncHandler(async (req: Request, res: Response) => {
    const courseData: Omit<Course, 'id'> = req.body;
    
    if (!courseData.title || !courseData.description) {
    throw new ValidationError('Title and description are required');
    }

    const course = await this.courseService.createCourse(courseData);
    
    res.status(201).json({
    success: true,
    data: course
    });
});

updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const courseData: Partial<Course> = req.body;
    
    const updatedCourse = await this.courseService.updateCourse(id, courseData);
    
    if (!updatedCourse) {
    throw new NotFoundError(`Course with id ${id} not found`);
    }

    res.status(200).json({
    success: true,
    data: updatedCourse
    });
});

deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await this.courseService.deleteCourse(id);
    
    res.status(200).json({
    success: true,
    message: 'Course deleted successfully'
    });
});

updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, progress, completedModules } = req.body;
    
    if (!userId || progress === undefined || !completedModules) {
    throw new ValidationError('UserId, progress, and completedModules are required');
    }

    const courseProgress = await this.courseService.updateProgress(id, {
    userId,
    progress,
    completedModules
    });

    res.status(200).json({
    success: true,
    data: courseProgress
    });
});

getProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
    throw new ValidationError('UserId is required');
    }

    const progress = await this.courseService.getProgress(id, String(userId));

    if (!progress) {
    throw new NotFoundError(`Progress not found for course ${id} and user ${userId}`);
    }

    res.status(200).json({
    success: true,
    data: progress
    });
});

getCourseAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const analytics = await this.courseService.getCourseAnalytics(id);
    
    if (!analytics) {
    throw new NotFoundError(`Analytics not found for course ${id}`);
    }

    res.status(200).json({
    success: true,
    data: analytics
    });
});
}

