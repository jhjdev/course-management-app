import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import { ICourse } from '../models/Course';

// User-related interfaces
export interface IRegisterRequest {
username: string;
email: string;
password: string;
confirmPassword: string;
}

export interface ILoginRequest {
email: string;
password: string;
}

export interface IUpdateProfileRequest {
username?: string;
email?: string;
currentPassword?: string;
newPassword?: string;
}

// Course-related interfaces
export interface ICourseCreateRequest {
title: string;
description: string;
category: string;
price: number;
level: 'beginner' | 'intermediate' | 'advanced';
tags: string[];
}

export interface ICourseUpdateRequest extends Partial<ICourseCreateRequest> {}

// Validation Schemas
export const userValidation = {
register: Joi.object<IRegisterRequest>({
    username: Joi.string()
    .min(3)
    .max(30)
    .required()
    .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
    }),
    email: Joi.string()
    .email()
    .required()
    .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
        'any.required': 'Password is required'
    }),
    confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
        'any.only': 'Passwords must match',
        'any.required': 'Password confirmation is required'
    })
}),

login: Joi.object<ILoginRequest>({
    email: Joi.string()
    .email()
    .required()
    .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string()
    .required()
    .messages({
        'any.required': 'Password is required'
    })
}),

updateProfile: Joi.object<IUpdateProfileRequest>({
    username: Joi.string()
    .min(3)
    .max(30)
    .optional()
    .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
    }),
    email: Joi.string()
    .email()
    .optional()
    .messages({
        'string.email': 'Please provide a valid email address'
    }),
    currentPassword: Joi.string()
    .required()
    .when('newPassword', {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional()
    })
    .messages({
        'any.required': 'Current password is required when updating password'
    }),
    newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .optional()
    .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    })
})
};

export const courseValidation = {
create: Joi.object<ICourseCreateRequest>({
    title: Joi.string()
    .min(5)
    .max(100)
    .required()
    .messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
    }),
    description: Joi.string()
    .min(20)
    .max(1000)
    .required()
    .messages({
        'string.min': 'Description must be at least 20 characters long',
        'string.max': 'Description cannot exceed 1000 characters',
        'any.required': 'Description is required'
    }),
    category: Joi.string()
    .required()
    .messages({
        'any.required': 'Category is required'
    }),
    price: Joi.number()
    .min(0)
    .required()
    .messages({
        'number.min': 'Price cannot be negative',
        'any.required': 'Price is required'
    }),
    level: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .required()
    .messages({
        'any.only': 'Level must be one of: beginner, intermediate, advanced',
        'any.required': 'Level is required'
    }),
    tags: Joi.array()
    .items(Joi.string())
    .min(1)
    .max(5)
    .messages({
        'array.min': 'At least one tag is required',
        'array.max': 'Cannot have more than 5 tags'
    })
}),

update: Joi.object<ICourseUpdateRequest>({
    title: Joi.string()
    .min(5)
    .max(100)
    .optional()
    .messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters'
    }),
    description: Joi.string()
    .min(20)
    .max(1000)
    .optional()
    .messages({
        'string.min': 'Description must be at least 20 characters long',
        'string.max': 'Description cannot exceed 1000 characters'
    }),
    category: Joi.string().optional(),
    price: Joi.number()
    .min(0)
    .optional()
    .messages({
        'number.min': 'Price cannot be negative'
    }),
    level: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .optional()
    .messages({
        'any.only': 'Level must be one of: beginner, intermediate, advanced'
    }),
    tags: Joi.array()
    .items(Joi.string())
    .min(1)
    .max(5)
    .optional()
    .messages({
        'array.min': 'At least one tag is required',
        'array.max': 'Cannot have more than 5 tags'
    })
})
};

// Generic validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
return async (req: Request, res: Response, next: NextFunction) => {
    try {
    await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
    });
    next();
    } catch (error) {
    if (error instanceof Joi.ValidationError) {
        const errors = error.details.map((detail) => ({
        field: detail.context?.key,
        message: detail.message
        }));
        return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
        });
    }
    next(error);
    }
};
};

// Custom validation rules
export const customRules = {
passwordStrength: (password: string): boolean => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
},

sanitizeHtml: (input: string): string => {
    return input
    .replace(/[<>]/g, '')
    .trim();
},

validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
};

