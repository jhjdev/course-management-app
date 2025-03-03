import { z } from 'zod';

// Base schema for shared user fields
const userBaseSchema = z.object({
email: z.string().email('Invalid email format').min(5).max(255),
firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
phoneNumber: z.string().optional(),
timezone: z.string().optional(),
});

// Registration schema with password requirements
export const registrationSchema = userBaseSchema.extend({
password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
confirmPassword: z.string(),
acceptTerms: z.boolean().refine(val => val === true, 'Terms must be accepted'),
}).refine(data => data.password === data.confirmPassword, {
message: "Passwords don't match",
path: ["confirmPassword"],
});

// Profile update schema
export const updateProfileSchema = userBaseSchema
.partial()
.extend({
    bio: z.string().max(500).optional(),
    avatar: z.string().url('Invalid URL format').optional(),
    notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    }).optional(),
});

// Password change schema
export const passwordChangeSchema = z.object({
currentPassword: z.string().min(1, 'Current password is required'),
newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
message: "New passwords don't match",
path: ["confirmNewPassword"],
});

// Email update schema
export const emailUpdateSchema = z.object({
newEmail: z.string().email('Invalid email format'),
password: z.string().min(1, 'Password is required for verification'),
});

// Admin user update schema
export const adminUserUpdateSchema = userBaseSchema
.extend({
    role: z.enum(['user', 'admin', 'moderator']),
    status: z.enum(['active', 'suspended', 'inactive']),
    notes: z.string().max(1000).optional(),
})
.partial();

// Query parameters schema
export const userQuerySchema = z.object({
page: z.number().int().positive().optional().default(1),
limit: z.number().int().min(1).max(100).optional().default(10),
sort: z.enum(['name', 'email', 'createdAt', 'status']).optional(),
order: z.enum(['asc', 'desc']).optional(),
search: z.string().optional(),
status: z.enum(['active', 'suspended', 'inactive']).optional(),
role: z.enum(['user', 'admin', 'moderator']).optional(),
});

