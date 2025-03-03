import { Router, Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { Controller, Get, Post, Put, Delete } from '@decorators/express';
import { IsString, IsInt, IsOptional, validate } from 'class-validator';
import { OpenAPI, Response as APIResponse } from '@decorators/openapi';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { UserGroupService } from '../services/UserGroupService';
import { CourseService } from '../services/CourseService';
import { ProgressService } from '../services/ProgressService';
import { BookmarkService } from '../services/BookmarkService';
import { NotificationService } from '../services/NotificationService';
import { SearchService } from '../services/SearchService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../utils/ErrorHandler';

// Request DTOs
class CreateCourseDto {
@IsString()
title: string;

@IsString()
description: string;

@IsString({ each: true })
@IsOptional()
tags?: string[];
}

@injectable()
@Controller('/api')
export class ApiController {
private router: Router;
private limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

constructor(
    @inject(UserGroupService) private userGroupService: UserGroupService,
    @inject(CourseService) private courseService: CourseService,
    @inject(ProgressService) private progressService: ProgressService,
    @inject(BookmarkService) private bookmarkService: BookmarkService,
    @inject(NotificationService) private notificationService: NotificationService,
    @inject(SearchService) private searchService: SearchService
) {
    this.router = Router();
    this.setupMiddleware();
}

private setupMiddleware() {
    this.router.use(helmet());
    this.router.use(this.limiter);
    this.router.use(AuthMiddleware.verify);
}

// Courses
@Get('/courses')
@OpenAPI({
    summary: 'Get all courses',
    security: [{ bearerAuth: [] }],
    responses: {
    '200': { description: 'List of courses' },
    '401': { description: 'Unauthorized' }
    }
})
async getCourses(req: Request, res: Response) {
    try {
    const { page = 1, limit = 10 } = req.query;
    const courses = await this.courseService.getAllCourses(Number(page), Number(limit));
    res.json(courses);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

@Post('/courses')
async createCourse(req: Request, res: Response) {
    try {
    const courseDto = new CreateCourseDto();
    Object.assign(courseDto, req.body);
    await validate(courseDto);
    const course = await this.courseService.createCourse(courseDto);
    res.status(201).json(course);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

// Progress
@Get('/progress/:courseId')
async getProgress(req: Request, res: Response) {
    try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const progress = await this.progressService.getProgress(userId, courseId);
    res.json(progress);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

@Put('/progress/:courseId')
async updateProgress(req: Request, res: Response) {
    try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { sectionId, completed } = req.body;
    const progress = await this.progressService.updateProgress(userId, courseId, sectionId, completed);
    res.json(progress);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

// Bookmarks
@Get('/bookmarks')
async getBookmarks(req: Request, res: Response) {
    try {
    const userId = req.user.id;
    const bookmarks = await this.bookmarkService.getUserBookmarks(userId);
    res.json(bookmarks);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

@Post('/bookmarks/:courseId')
async addBookmark(req: Request, res: Response) {
    try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { tags, notes } = req.body;
    const bookmark = await this.bookmarkService.addBookmark(userId, courseId, tags, notes);
    res.status(201).json(bookmark);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

// Search
@Get('/search')
async search(req: Request, res: Response) {
    try {
    const { query, filters, page = 1, limit = 10 } = req.query;
    const results = await this.searchService.search(
        String(query),
        filters as Record<string, string>,
        Number(page),
        Number(limit)
    );
    res.json(results);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

// User Groups
@Get('/groups')
async getGroups(req: Request, res: Response) {
    try {
    const groups = await this.userGroupService.getAllGroups();
    res.json(groups);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

@Post('/groups')
async createGroup(req: Request, res: Response) {
    try {
    const { name, description } = req.body;
    const group = await this.userGroupService.createGroup(name, description);
    res.status(201).json(group);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

// Notifications
@Get('/notifications')
async getNotifications(req: Request, res: Response) {
    try {
    const userId = req.user.id;
    const notifications = await this.notificationService.getUserNotifications(userId);
    res.json(notifications);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

@Put('/notifications/:id/read')
async markNotificationRead(req: Request, res: Response) {
    try {
    const { id } = req.params;
    const userId = req.user.id;
    await this.notificationService.markAsRead(userId, id);
    res.sendStatus(204);
    } catch (error) {
    ErrorHandler.handle(error, res);
    }
}

getRouter(): Router {
    return this.router;
}
}

