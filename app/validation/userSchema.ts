import Joi from 'joi';

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

export const registrationSchema = Joi.object({
email: Joi.string()
    .email()
    .required()
    .messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
    }),
password: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
    'string.pattern.base': 'Password must be at least 8 characters long and contain at least one number and one special character',
    'any.required': 'Password is required'
    }),
firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
    }),
lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
    }),
role: Joi.string()
    .valid('student', 'instructor')
    .default('student')
    .messages({
    'any.only': 'Role must be either student or instructor'
    })
});

export const loginSchema = Joi.object({
email: Joi.string()
    .email()
    .required()
    .messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
    }),
password: Joi.string()
    .required()
    .messages({
    'any.required': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
firstName: Joi.string()
    .min(2)
    .max(50)
    .messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
    }),
lastName: Joi.string()
    .min(2)
    .max(50)
    .messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
    }),
email: Joi.string()
    .email()
    .messages({
    'string.email': 'Please enter a valid email address'
    }),
currentPassword: Joi.string()
    .when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.forbidden()
    })
    .messages({
    'any.required': 'Current password is required when setting a new password'
    }),
newPassword: Joi.string()
    .pattern(PASSWORD_REGEX)
    .messages({
    'string.pattern.base': 'New password must be at least 8 characters long and contain at least one number and one special character'
    })
}).min(1).messages({
'object.min': 'At least one field must be provided for update'
});

