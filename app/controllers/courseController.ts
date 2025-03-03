import { Request, Response } from 'express';
import { CourseRepository } from '../repositories/CourseRepository';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { courseSchema, courseUpdateSchema, courseProgressSchema } from '../validations/course.schema';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { ICourse, ICourseProgress } from '../models/Course';
import { ValidationError, NotFoundError, UnauthorizedError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { courseRepository } from '../repositories/courseRepository';
import { Course } from '../models/course';
import { validateCourseInput, validateEnrollmentInput, validateProgressInput } from '../validations/course.validation';
import { ICourseDocument, ICourseProgress } from '../types/course.types';

/**
* Controller for handling course-related operations
* @swagger
* tags:
*   name: Courses
*   description: Course management endpoints
*/
export class CourseController {
    constructor(private courseRepository: CourseRepository) {}

    /**
    * Create a new course
    * @param req AuthenticatedRequest
    * @param res Response
    */
    public createCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            logger.info('Creating new course', { userId: req.user._id });
            
            const validatedData = courseSchema.parse(req.body);
            
            const courseData = {
                ...validatedData,
                creator: req.user._id,
                status: 'draft'
            };
            
            const course = await this.courseRepository.create(courseData);
            logger.info('Course created successfully', { courseId: course._id });
            
            res.status(201).json({
                success: true,
                message: 'Course created successfully',
                data: course
            });
        } catch (error) {
            logger.error('Error creating course', { error, userId: req.user._id });
            
            if (error instanceof ValidationError) {
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error creating course',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    };

    /**
    * Get all courses with pagination and filters
    * @param req Request
    * @param res Response
    */
    public getAllCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            logger.info('Fetching all courses', { user: req.user._id });
            
            const { page = 1, limit = 10, status, category, sortBy = 'createdAt', order = 'desc' } = req.query;
            
            const filters = {
                ...(status && { status: status as string }),
                ...(category && { category: category as string })
            };
            
            const sort = { [sortBy as string]: order === 'desc' ? -1 : 1 };
            
            const [courses, total] = await Promise.all([
                this.courseRepository.findAll(filters, { 
                    page: Number(page), 
                    limit: Number(limit), 
                    sort 
                }),
                this.courseRepository.count(filters)
            ]);
            
            logger.info('Courses fetched successfully', { count: courses.length });
            
            res.status(200).json({
                success: true,
                data: courses,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            logger.error('Error fetching courses', { error });
            res.status(500).json({ 
                success: false, 
                message: 'Error fetching courses',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
    * Get course by ID
    * @param req Request
    * @param res Response
    */
    public getCourse = async (req: Request, res: Response): Promise<void> => {
        try {
            const courseId = req.params.id;
            logger.info('Fetching course by ID', { courseId });
            
            const course = await this.courseRepository.findById(courseId);
            if (!course) {
                throw new NotFoundError('Course not found');
            }
            
            logger.info('Course fetched successfully', { courseId });
            
            res.status(200).json({
                success: true,
                data: course
            });
        } catch (error) {
            logger.error('Error fetching course', { error, courseId: req.params.id });
            
            if (error instanceof NotFoundError) {
                res.status(404).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error fetching course',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    };

    /**
    * Update a course
    * @param req AuthenticatedRequest
    * @param res Response
    */
    public updateCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const courseId = req.params.id;
            logger.info('Updating course', { courseId, userId: req.user._id });
            
            const course = await this.courseRepository.findById(courseId);
            if (!course) {
                throw new NotFoundError('Course not found');
            }
            
            if (course.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                throw new UnauthorizedError('Not authorized to update this course');
            }
            
            const validatedData = courseUpdateSchema.parse(req.body);
            const updatedCourse = await this.courseRepository.update(courseId, validatedData);
            
            logger.info('Course updated successfully', { courseId });
            
            res.status(200).json({
                success: true,
                message: 'Course updated successfully',
                data: updatedCourse
            });
        } catch (error) {
            logger.error('Error updating course', { error, courseId: req.params.id });
            
            if (error instanceof NotFoundError) {
                res.status(404).json({ success: false, message: error.message });
            } else if (error instanceof UnauthorizedError) {
                res.status(403).json({ success: false, message: error.message });
            } else if (error instanceof ValidationError) {
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error updating course',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    };

    /**
    * Delete a course
    * @param req AuthenticatedRequest
    * @param res Response
    */
    public deleteCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const courseId = req.params.id;
            logger.info('Deleting course', { courseId, userId: req.user._id });
            
            const course = await this.courseRepository.findById(courseId);
            if (!course) {
                throw new NotFoundError('Course not found');
            }
            
            if (course.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                throw new UnauthorizedError('Not authorized to delete this course');
            }
            
            await this.courseRepository.delete(courseId);
            
            logger.info('Course deleted successfully', { courseId });
            
            res.status(200).json({
                success: true,
                message: 'Course deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting course', { error, courseId: req.params.id });
            
            if (error instanceof NotFoundError) {
                res.status(404).json({ success: false, message: error.message });
            } else if (error instanceof UnauthorizedError) {
                res.status(403).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error deleting course',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    };

    /**
    * Enroll in a course
    * @param req AuthenticatedRequest
    * @param res Response
    */
    public enrollInCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const courseId = req.params.id;
            const userId = req.user._id;
            
            logger.info('Enrolling in course', { courseId, userId });
            
            const course = await this.courseRepository.findById(courseId);
            if (!course) {
                throw new NotFoundError('Course not found');
            }
            
            if (course.status !== 'published') {
                throw new ValidationError('Cannot enroll in unpublished course');
            }
            
            const enrollmentResult = await this.courseRepository.enrollStudent(courseId, userId);
            
            logger.info('Course enrollment successful', { courseId, userId });
            
            res.status(200).json({
                success: true,
                message: enrollmentResult.waitlisted ? 'Added to course waitlist' : 'Successfully enrolled in course',
                data: enrollmentResult
            });
        } catch (error) {
            logger.error('Error enrolling in course', { error, courseId: req.params.id, userId: req.user._id });
            
            if (error instanceof NotFoundError) {
                res.status(404).json({ success: false, message: error.message });
            } else if (error instanceof ValidationError) {
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error enrolling in course',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    };

    /**
    * Update course progress
    * @param req AuthenticatedRequest
    * @param res Response
    */
    public updateCourseProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const courseId = req.params.id;
            const userId = req.user._id;
            
            logger.info('Updating course progress', { courseId, userId });
            
            if (!this.hasAvailableSpots()) {
                throw new ConflictError('Course is full');
            }
            if (this.enrolledStudents.includes(studentId)) {
                throw new ConflictError('Student already enrolled');
            }

            try {
                await this.validateEnrollmentEligibility(studentId);
                this.enrolledStudents.push(studentId);
                await this.save();
                
                logger.info('Student enrolled successfully', { courseId: this._id, studentId });
                
                // Initialize progress tracking
                await this.initializeStudentProgress(studentId);
            } catch (error) {
                logger.error('Error enrolling student', { error, courseId: this._id, studentId });
                throw error;
            }
            };
                data: progress
            });
        } catch (error) {
            logger.error('Error updating course progress', { 
                error, 
                courseId: req.params.id, 
                userId: req.user._id 
            });
            
            if (error instanceof NotFoundError) {
                res.status(404).json({ success: false, message: error.message });
            } else if (error instanceof ValidationError) {
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error updating course progress',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    };

/**
* @swagger
* /courses/{id}/archive:
*   post:
*     summary: Archive a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public archiveCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const course = await this.courseRepository.findById(req.params.id);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        if (course.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            throw new UnauthorizedError('Not authorized to archive this course');
        }

        await this.courseRepository.updateStatus(req.params.id, 'archived');
        res.status(200).json({ success: true, message: 'Course archived successfully' });
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error archiving course' });
        }
    }
};

/**
* @swagger
* /courses/{id}/enrollment-status:
*   get:
*     summary: Get enrollment status for a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public getEnrollmentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const courseId = req.params.id;
        const userId = req.user._id;

        const course = await this.courseRepository.findById(courseId);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        const enrollmentStatus = await this.courseRepository.getEnrollmentStatus(courseId, userId);
        res.status(200).json({
            success: true,
            data: enrollmentStatus
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error getting enrollment status' });
        }
    }
};

/**
* @swagger
* /courses/drafts:
*   get:
*     summary: Get draft courses (instructor only)
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*/
public getDraftCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!['admin', 'instructor'].includes(req.user.role)) {
            throw new UnauthorizedError('Only instructors can access draft courses');
        }

        const { page = 1, limit = 10 } = req.query;
        const filters = {
            creator: req.user._id,
            status: 'draft'
        };

        const [courses, total] = await Promise.all([
            this.courseRepository.findAll(filters, { page: Number(page), limit: Number(limit) }),
            this.courseRepository.count(filters)
        ]);

        res.status(200).json({
            success: true,
            data: courses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error fetching draft courses' });
        }
    }
};

/**
* @swagger
* /courses:
*   get:
*     summary: Get all courses
*     tags: [Courses]
*     parameters:
*       - in: query
*         name: page
*         schema:
*           type: integer
*       - in: query
*         name: limit
*         schema:
*           type: integer
*       - in: query
*         name: category
*         schema:
*           type: string
*       - in: query
*         name: difficulty
*         schema:
*           type: string
*       - in: query
*         name: search
*         schema:
*           type: string
*/
public getAllPublishedCourses = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, difficulty, search, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
        const filters = {
            ...(category && { category: category as string }),
            ...(difficulty && { difficulty: difficulty as string }),
            ...(search && { title: new RegExp(search as string, 'i') }),
            status: 'published'
        };
        
        const sort = { [sortBy as string]: order === 'desc' ? -1 : 1 };
        
        const [courses, total] = await Promise.all([
            this.courseRepository.findAll(filters, { page: Number(page), limit: Number(limit), sort }),
            this.courseRepository.count(filters)
        ]);
        
        res.status(200).json({
            success: true,
            data: courses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching courses' });
    }
};

public getAllCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'admin') {
            throw new UnauthorizedError('Only administrators can access all courses');
        }

        const { page = 1, limit = 10, status, sortBy = 'createdAt', order = 'desc' } = req.query;
        const filters = {
            ...(status && { status: status as string })
        };
        
        const sort = { [sortBy as string]: order === 'desc' ? -1 : 1 };
        
        const [courses, total] = await Promise.all([
            this.courseRepository.findAll(filters, { page: Number(page), limit: Number(limit), sort }),
            this.courseRepository.count(filters)
        ]);
        
        res.status(200).json({
            success: true,
            data: courses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error fetching courses' });
        }
    }
};

/**
* @swagger
* /courses/{id}:
*   get:
*     summary: Get course by ID
*     tags: [Courses]
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*/
public getCourseById = async (req: Request, res: Response): Promise<void> => {
try {
    const course = await this.courseRepository.findById(req.params.id);
    if (!course) {
    throw new NotFoundError('Course not found');
    }
    
    res.status(200).json({ success: true, data: course });
} catch (error) {
    if (error instanceof NotFoundError) {
    res.status(404).json({ success: false, message: error.message });
    } else if (error instanceof Error) {
    res.status(500).json({ success: false, message: 'Error fetching course', error: error.message });
    }
}
};

/**
* @swagger
* /courses/{id}:
*   put:
*     summary: Update a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/CourseUpdate'
*/

/**
* @swagger
* /courses/{id}:
*   delete:
*     summary: Delete a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public deleteCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'admin') {
            throw new UnauthorizedError('Only administrators can delete courses');
        }

        const course = await this.courseRepository.findById(req.params.id);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        // Check if course has enrolled students
        if (course.enrolledStudents && course.enrolledStudents.length > 0) {
            throw new ValidationError('Cannot delete course with enrolled students');
        }

        await this.courseRepository.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error deleting course', error: error.message });
        }
    }
};

/**
* @swagger
* /courses/{id}/enroll:
*   post:
*     summary: Enroll in a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public enrollInCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const courseId = req.params.id;
        const userId = req.user._id;

        const course = await this.courseRepository.findById(courseId);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        if (course.status !== 'published') {
            throw new ValidationError('Cannot enroll in unpublished course');
        }

        const enrollmentResult = await this.courseRepository.enrollStudent(courseId, userId);
        
        if (enrollmentResult.waitlisted) {
            res.status(200).json({ 
                success: true, 
                message: 'Added to course waitlist',
                position: enrollmentResult.waitlistPosition 
            });
        } else {
            res.status(200).json({ 
                success: true, 
                message: 'Successfully enrolled in course'
            });
        }
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error enrolling in course', error: error.message });
        }
    }
};

public getTeachingCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!['admin', 'instructor'].includes(req.user.role)) {
            throw new UnauthorizedError('Only instructors can access teaching courses');
        }

        const { page = 1, limit = 10, status, sortBy = 'createdAt', order = 'desc' } = req.query;
        const filters = {
            creator: req.user._id,
            ...(status && { status: status as string })
        };
        
        const sort = { [sortBy as string]: order === 'desc' ? -1 : 1 };
        
        const [courses, total] = await Promise.all([
            this.courseRepository.findAll(filters, { page: Number(page), limit: Number(limit), sort }),
            this.courseRepository.count(filters)
        ]);
        
        res.status(200).json({
            success: true,
            data: courses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error fetching teaching courses' });
        }
    }
};

/**
* @swagger
* /courses/enrolled:
*   get:
*     summary: Get user's enrolled courses
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: query
*         name: page
*         schema:
*           type: integer
*       - in: query
*         name: limit
*         schema:
*           type: integer
*/
public getUserEnrolledCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 10, status = 'active' } = req.query;
        const userId = req.user._id;
        
        const [enrolledCourses, total] = await Promise.all([
            this.courseRepository.findEnrolledCourses(userId, {
                status: status as string,
                page: Number(page),
                limit: Number(limit)
            }),
            this.courseRepository.countEnrolledCourses(userId, { status: status as string })
        ]);
        
        res.status(200).json({
            success: true,
            data: enrolledCourses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching enrolled courses' });
    }
};
}

/**
* @swagger
* /courses/{id}/unenroll:
*   post:
*     summary: Unenroll from a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public unenrollFromCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const courseId = req.params.id;
        const userId = req.user._id;

        const course = await this.courseRepository.findById(courseId);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        await this.courseRepository.unenrollStudent(courseId, userId);
        res.status(200).json({ success: true, message: 'Successfully unenrolled from course' });
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error unenrolling from course', error: error.message });
        }
    }
};

/**
* @swagger
* /courses/{id}/students:
*   get:
*     summary: Get enrolled students for a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*       - in: query
*         name: page
*         schema:
*           type: integer
*       - in: query
*         name: limit
*         schema:
*           type: integer
*/
public getEnrolledStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const course = await this.courseRepository.findById(req.params.id);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        // Check if user is instructor of the course or admin
        if (course.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            throw new UnauthorizedError('Not authorized to view enrolled students');
        }

        const { page = 1, limit = 10 } = req.query;
        const students = await this.courseRepository.getEnrolledStudents(
            req.params.id,
            { page: Number(page), limit: Number(limit) }
        );

        res.status(200).json({ success: true, data: students });
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error fetching enrolled students', error: error.message });
        }
    }
};

/**
* @swagger
* /courses/{id}/publish:
*   post:
*     summary: Publish a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public updateCourseStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'admin') {
            throw new UnauthorizedError('Only administrators can update course status');
        }

        const { status } = req.body;
        if (!['draft', 'published', 'archived'].includes(status)) {
            throw new ValidationError('Invalid course status');
        }

        const course = await this.courseRepository.findById(req.params.id);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        await this.courseRepository.updateStatus(req.params.id, status);
        res.status(200).json({ success: true, message: `Course ${status} successfully` });
    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ success: false, message: error.message });
        } else if (error instanceof UnauthorizedError) {
            res.status(403).json({ success: false, message: error.message });
        } else if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Error updating course status' });
        }
    }
};

/**
* @swagger
* /courses/{id}/archive:
*   post:
*     summary: Archive a course
*     tags: [Courses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - name: id
*         in: path
*         required: true
*         schema:
*           type: string
*/
public archiveCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const course = await this.courseRepository.findById(req.params.id);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        if (course.creator.toString() !== req.user

