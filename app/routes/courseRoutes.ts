import express from 'express';
import { validateRequest } from '../middleware/validation';
import { requireAuth, requireAdmin, requireInstructor, isInstructorOrAdmin, verifyOwnership } from '../middleware/auth';
import { CourseController } from '../controllers/courseController';
import { rateLimit } from 'express-rate-limit';
import {
createCourseSchema,
updateCourseSchema,
enrollmentSchema,
courseStatusSchema,
courseQuerySchema,
progressUpdateSchema,
courseSearchSchema
} from '../validation/courseSchema';

const router = express.Router();
const courseController = new CourseController();

// Rate limiting for enrollment endpoints
const enrollmentLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 5, // 5 requests per window
message: 'Too many enrollment attempts, please try again later'
});

/**
* @swagger
* /api/courses:
*   get:
*     tags: [Courses]
*     summary: Get all published courses
*     parameters:
*       - in: query
*         name: search
*         schema:
*           type: string
*         description: Search term for course title/description
*/
/**
* @swagger
* /api/courses:
*   get:
*     tags: [Courses]
*     summary: Get all published courses with optional filtering
*     parameters:
*       - in: query
*         name: search
*         schema:
*           type: string
*         description: Search term for course title/description
*       - in: query
*         name: page
*         schema:
*           type: integer
*         description: Page number for pagination
*       - in: query
*         name: limit
*         schema:
*           type: integer
*         description: Number of items per page
*/
router.get('/',
cache('5 minutes'), 
validateRequest(courseSearchSchema), 
courseController.getAllPublishedCourses
);

/**
* @swagger
* /api/courses/{id}:
*   get:
*     tags: [Courses]
*     summary: Get course by ID
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*/
router.get('/:id', courseController.getCourseById);

// Student routes (authenticated)
/**
* @swagger
* /api/courses/enrolled:
*   get:
*     tags: [Courses]
*     summary: Get user's enrolled courses
*     security:
*       - bearerAuth: []
*/
router.get('/enrolled', 
requireAuth,
validateRequest(courseQuerySchema),
courseController.getUserEnrolledCourses
);

router.get('/:id/enrollment-status',
requireAuth,
validateRequest(enrollmentSchema),
courseController.getEnrollmentStatus
);

router.post('/:id/enroll',
enrollmentLimiter,
requireAuth,
validateRequest(enrollmentSchema),
courseController.enrollInCourse
);

router.delete('/:id/enroll',
requireAuth,
validateRequest(enrollmentSchema),
courseController.unenrollFromCourse
);

// Instructor routes
router.get('/teaching', 
requireAuth, 
requireInstructor, 
validateRequest(courseQuerySchema),
courseController.getTeachingCourses
);

router.get('/drafts',
requireAuth,
requireInstructor,
validateRequest(courseQuerySchema),
courseController.getDraftCourses
);

router.post('/',
requireAuth,
requireInstructor,
validateRequest(createCourseSchema),
courseController.createCourse
);

router.put('/:id',
requireAuth,
isInstructorOrAdmin,
verifyOwnership,
validateRequest(updateCourseSchema),
courseController.updateCourse
);
router.get('/:id/students',
requireAuth,
isInstructorOrAdmin,
verifyOwnership,
courseController.getEnrolledStudents
);

// Admin routes
router.get('/all', 
requireAuth, 
requireAdmin, 
validateRequest(courseQuerySchema),
courseController.getAllCourses
);

router.delete('/:id',
requireAuth,
requireAdmin,
courseController.deleteCourse
);

router.patch('/:id/status',
requireAuth,
isInstructorOrAdmin,
verifyOwnership,
validateRequest(courseStatusSchema),
courseController.updateCourseStatus
);

export default router;
