import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

// Valid categories and difficulties
const categories = ['development', 'business', 'design', 'marketing', 'personal-development'] as const;
const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
const courseStatuses = ['draft', 'published', 'archived'] as const;
const allowedSortFields = ['title', 'createdAt', 'startDate', 'category', 'difficulty'] as const;

// Custom validator for MongoDB ObjectId
const objectIdValidator = z.string().refine((val) => isValidObjectId(val), {
message: 'Invalid MongoDB ObjectId format'
});

export const createCourseSchema = z.object({
title: z.string()
    .min(3, { message: 'Title must be at least 3 characters long' })
    .max(100, { message: 'Title cannot exceed 100 characters' }),

description: z.string()
    .min(10, { message: 'Description must be at least 10 characters long' })
    .max(1000, { message: 'Description cannot exceed 1000 characters' }),

category: z.enum(categories, {
    errorMap: () => ({ message: `Category must be one of: ${categories.join(', ')}` })
}),

startDate: z.date()
.min(new Date(), { message: 'Start date must be in the future' }),

endDate: z.date()
.refine((date, ctx) => {
    return date > ctx.data.startDate;
}, { message: 'End date must be after start date' }),

difficulty: z.enum(difficulties, {
errorMap: () => ({ message: 'Difficulty must be either: beginner, intermediate, or advanced' })
}),

price: z.number()
.min(0, { message: 'Price cannot be negative' }),

maxStudents: z.number()
.int()
.min(1, { message: 'Maximum students must be at least 1' }),

duration: z.number()
.min(0.5, { message: 'Duration must be at least 0.5 hours' }),

prerequisites: z.array(z.string())
.optional()
.describe('Prerequisites must be an array of strings'),

learningOutcomes: z.array(z.string())
.min(1, { message: 'At least one learning outcome is required' })
}).strict();

export const updateCourseSchema = createCourseSchema.fork(
Object.keys(createCourseSchema.describe().keys),
(schema) => schema.optional()
).options({ stripUnknown: true });

export const enrollmentQuerySchema = Joi.object({
    status: Joi.string()
        .valid('enrolled', 'completed', 'in-progress')
        .optional()
        .messages({
        'any.only': 'Status must be one of: enrolled, completed, in-progress'
        }),
    page: Joi.number()
        .min(1)
        .default(1)
        .messages({
        'number.min': 'Page must be greater than 0'
        }),
    limit: Joi.number()
        .min(1)
        .max(50)
        .default(10)
        .messages({
        'number.min': 'Limit must be greater than 0',
        'number.max': 'Limit cannot exceed 50'
        }),
    sortBy: Joi.string()
        .valid('enrollmentDate', 'completionDate', 'progress')
        .default('enrollmentDate')
        .messages({
        'any.only': 'Sort field must be one of: enrollmentDate, completionDate, progress'
        })
});

export const enrollmentSchema = Joi.object({
courseId: Joi.string()
    .custom((value, helpers) => {
    if (!isValidObjectId(value)) {
        return helpers.error('any.invalid');
    }
    return value;
    })
    .required()
    .messages({
    'any.invalid': 'Invalid course ID format',
    'any.required': 'Course ID is required'
    }),
userId: Joi.string()
    .custom((value, helpers) => {
    if (!isValidObjectId(value)) {
        return helpers.error('any.invalid');
    }
    return value;
    })
    .optional()
    .messages({
    'any.invalid': 'Invalid user ID format'
    })
});

export const enrollmentHistorySchema = Joi.object({
    courseId: Joi.string()
        .custom((value, helpers) => {
            if (!isValidObjectId(value)) {
                return helpers.error('any.invalid');
            }
            return value;
        })
        .required()
        .messages({
            'any.invalid': 'Invalid course ID format',
            'any.required': 'Course ID is required'
        }),
    startDate: Joi.date()
        .default(Date.now)
        .messages({
            'date.base': 'Invalid start date'
        }),
    completionDate: Joi.date()
        .min(Joi.ref('startDate'))
        .messages({
            'date.min': 'Completion date must be after start date'
        }),
    progress: Joi.number()
        .min(0)
        .max(100)
        .default(0)
        .messages({
            'number.min': 'Progress cannot be negative',
            'number.max': 'Progress cannot exceed 100%'
        })
});

export const courseStatusSchema = Joi.object({
status: Joi.string()
    .valid(...courseStatuses)
    .required()
    .messages({
    'any.only': `Status must be one of: ${courseStatuses.join(', ')}`,
    'any.required': 'Status is required'
    })
});

export const courseQuerySchema = Joi.object({
page: Joi.number()
    .min(1)
    .default(1)
    .messages({
    'number.min': 'Page must be greater than 0'
    }),
limit: Joi.number()
    .min(1)
    .max(100)
    .default(10)
    .messages({
    'number.min': 'Limit must be greater than 0',
    'number.max': 'Limit cannot exceed 100'
    }),
category: Joi.string()
    .valid(...categories)
    .optional()
    .messages({
    'any.only': `Category must be one of: ${categories.join(', ')}`
    }),
difficulty: Joi.string()
    .valid(...difficulties)
    .optional()
    .messages({
    'any.only': `Difficulty must be one of: ${difficulties.join(', ')}`
    }),
search: Joi.string()
    .optional()
    .allow('')
    .min(2)
    .max(50)
    .messages({
    'string.min': 'Search term must be at least 2 characters',
    'string.max': 'Search term cannot exceed 50 characters'
    }),
sortBy: Joi.string()
    .valid(...allowedSortFields)
    .optional()
    .messages({
    'any.only': `Sort field must be one of: ${allowedSortFields.join(', ')}`
    }),
order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
    .messages({
    'any.only': 'Order must be either asc or desc'
    })
});

// Export validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema) => {
return (req: any, res: any, next: any) => {
    const result = schema.validate(req.body, { abortEarly: false });
    if (result.error) {
    const errors = result.error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
    }));
    return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
    });
    }
    req.validatedData = result.value;
    next();
};
};
