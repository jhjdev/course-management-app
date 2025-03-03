import { Request, Response, NextFunction } from 'express';
import { MongoError } from 'mongodb';
import { logger } from './logger';

/**
* Interface for standardized error responses
*/
interface ErrorResponse {
status: number;
message: string;
code?: string;
stack?: string;
details?: unknown;
}

/**
* Base class for application errors
*/
export class AppError extends Error {
constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public details?: unknown
) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
}
}

/**
* Error class for resource not found errors (404)
*/
export class NotFoundError extends AppError {
constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
}
}

/**
* Error class for unauthorized access (401)
*/
export class UnauthorizedError extends AppError {
constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
}
}

/**
* Error class for forbidden access (403)
*/
export class ForbiddenError extends AppError {
constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
}
}

/**
* Error class for validation errors (400)
*/
export class ValidationError extends AppError {
constructor(message = 'Validation error', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
}
}

/**
* Error class for database errors (500)
*/
export class DatabaseError extends AppError {
constructor(message = 'Database error', details?: unknown) {
    super(message, 500, 'DATABASE_ERROR', details);
}
}

/**
* Formats error response based on environment
*/
const formatError = (error: Error | AppError): ErrorResponse => {
const isProduction = process.env.NODE_ENV === 'production';

if (error instanceof AppError) {
    return {
    status: error.status,
    message: error.message,
    code: error.code,
    details: error.details,
    ...((!isProduction && error.stack) && { stack: error.stack })
    };
}

// Default error response
return {
    status: 500,
    message: isProduction ? 'Internal server error' : error.message,
    ...((!isProduction && error.stack) && { stack: error.stack })
};
};

/**
* Handles MongoDB specific errors
*/
const handleMongoError = (error: MongoError): AppError => {
switch (error.code) {
    case 11000:
    return new ValidationError('Duplicate key error', error);
    default:
    return new DatabaseError('Database error', error);
}
};

/**
* Global error handling middleware
*/
export const errorHandler = (
error: Error | AppError,
req: Request,
res: Response,
next: NextFunction
): void => {
// Log error
logger.error('Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
});

// Handle MongoDB errors
if (error instanceof MongoError) {
    error = handleMongoError(error);
}

// Format and send error response
const errorResponse = formatError(error);
res.status(errorResponse.status).json(errorResponse);
};

/**
* Async error handler wrapper
*/
export const asyncHandler = (fn: Function) => {
return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
};

/**
* Error monitoring setup
* This can be extended to integrate with error tracking services like Sentry
*/
export const setupErrorMonitoring = (): void => {
process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Rejection:', reason);
    // Add integration with error tracking service here
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    // Add integration with error tracking service here
    process.exit(1);
});
};

