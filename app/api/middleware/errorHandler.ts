import { Request, Response, NextFunction } from 'express';

// Error response interface
interface ErrorResponse {
status: number;
message: string;
code: string;
details?: unknown;
}

// Base API Error class
export class APIError extends Error {
constructor(
    public message: string,
    public status: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR',
    public details?: unknown
) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
}
}

// Specific error classes
export class NotFoundError extends APIError {
constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
}
}

export class ValidationError extends APIError {
constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
}
}

export class UnauthorizedError extends APIError {
constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
}
}

export class ForbiddenError extends APIError {
constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
}
}

export class ConflictError extends APIError {
constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
}
}

// Error logging function
const logError = (err: Error): void => {
console.error(`[${new Date().toISOString()}] Error:`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err instanceof APIError && { 
    status: err.status,
    code: err.code,
    details: err.details 
    })
});
};

// Error handler middleware
export const errorHandler = (
err: Error,
req: Request,
res: Response,
next: NextFunction
): void => {
logError(err);

// Handle APIError instances
if (err instanceof APIError) {
    const response: ErrorResponse = {
    status: err.status,
    message: err.message,
    code: err.code,
    details: err.details
    };
    res.status(err.status).json(response);
    return;
}

// Handle validation errors from express-validator
if (err.name === 'ValidationError') {
    const response: ErrorResponse = {
    status: 400,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: err
    };
    res.status(400).json(response);
    return;
}

// Handle unexpected errors
const response: ErrorResponse = {
    status: 500,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
};
res.status(500).json(response);
};

// Async handler wrapper
export const asyncHandler = (
fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
};

