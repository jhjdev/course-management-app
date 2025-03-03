import { z } from 'zod';

/** Valid course difficulty levels */
export const CourseLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);

/** Duration format in minutes/hours */
const DurationSchema = z.object({
value: z.number().positive(),
unit: z.enum(['minutes', 'hours'])
}).strict();

/** Base course fields shared between creation and update */
const courseBaseSchema = {
title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Title can only contain letters, numbers, spaces, hyphens and underscores'),

description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),

duration: DurationSchema,

level: CourseLevelEnum,

price: z.number()
    .positive('Price must be greater than 0')
    .max(9999.99, 'Price cannot exceed 9999.99'),

prerequisites: z.array(z.string())
    .optional()
    .default([]),

tags: z.array(z.string()
    .min(2, 'Tag must be at least 2 characters')
    .max(20, 'Tag cannot exceed 20 characters'))
    .optional()
    .default([]),

maxStudents: z.number()
    .int('Maximum students must be a whole number')
    .positive('Maximum students must be greater than 0')
    .optional(),

materials: z.array(z.object({
    title: z.string().min(1, 'Material title is required'),
    url: z.string().url('Invalid material URL'),
    type: z.enum(['VIDEO', 'DOCUMENT', 'QUIZ'])
})).optional().default([])
};

/** Schema for creating a new course */
export const createCourseSchema = z.object({
...courseBaseSchema,
startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
endDate: z.string()
    .datetime('Invalid end date format')
    .optional()
}).strict().refine(
(data) => !data.endDate || !data.startDate || new Date(data.endDate) > new Date(data.startDate),
{ message: 'End date must be after start date' }
);

/** Schema for updating an existing course */
export const updateCourseSchema = z.object({
...courseBaseSchema,
isActive: z.boolean().optional(),
startDate: z.string().datetime().optional(),
endDate: z.string().datetime().optional()
}).strict().partial();

/** Schema for course enrollment */
export const courseEnrollmentSchema = z.object({
studentId: z.string().uuid('Invalid student ID'),
courseId: z.string().uuid('Invalid course ID'),
enrollmentDate: z.string().datetime().default(() => new Date().toISOString()),
paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED']).default('PENDING')
}).strict();

/** Schema for tracking course progress */
export const progressTrackingSchema = z.object({
courseId: z.string().uuid('Invalid course ID'),
studentId: z.string().uuid('Invalid student ID'),
completedModules: z.array(z.string().uuid('Invalid module ID')),
currentModule: z.string().uuid('Invalid module ID'),
lastAccessDate: z.string().datetime(),
progress: z.number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100%'),
timeSpent: z.number().positive('Time spent must be positive'),
status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED')
}).strict();

/** Schema for course querying and filtering */
export const courseQuerySchema = z.object({
search: z.string().optional(),
level: CourseLevelEnum.optional(),
minPrice: z.number().optional(),
maxPrice: z.number().optional(),
tags: z.array(z.string()).optional(),
startDate: z.string().datetime().optional(),
endDate: z.string().datetime().optional(),
isActive: z.boolean().optional(),
sortBy: z.enum(['title', 'price', 'startDate', 'level']).optional(),
sortOrder: z.enum(['asc', 'desc']).optional(),
page: z.number().int().positive().optional(),
limit: z.number().int().positive().max(100).optional()
}).strict();

// Export inferred types
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseEnrollmentInput = z.infer<typeof courseEnrollmentSchema>;
export type ProgressTrackingInput = z.infer<typeof progressTrackingSchema>;
export type CourseQueryInput = z.infer<typeof courseQuerySchema>;

