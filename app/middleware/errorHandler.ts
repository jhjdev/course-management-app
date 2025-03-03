import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import logger from '../utils/logger';

// Custom error classes for different types of errors
export class AppError extends Error {
constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
}
}

export class ValidationError extends AppError {
constructor(message: string) {
    super(400, message);
}
}

export class AuthenticationError extends AppError {
constructor(message: string) {
    super(401, message);
}
}

export class NotFoundError extends AppError {
constructor(message: string) {
    super(404, message);
}
}

export class ForbiddenError extends AppError {
constructor(message: string) {
    super(403, message);
}
}

export class DatabaseError extends AppError {
constructor(message: string) {
    super(500, message, false);
}
}

export class ConflictError extends AppError {
constructor(message: string) {
    super(409, message);
}
}

export class JoiValidationError extends AppError {
constructor(errors: any[]) {
    super(400, 'Validation Error', true);
    this.errors = errors;
}
public errors: any[];
}
interface ErrorResponse {
status: 'error' | 'fail';
statusCode: number;
message: string;
stack?: string;
errors?: Record<string, unknown>;
path?: string;
timestamp: string;
code?: string;
correlationId?: string;
requestId?: string;
errorType?: string;
}

const handleMongooseValidationError = (err: mongoose.Error.ValidationError): AppError => {
const errors = Object.values(err.errors).map(el => ({
    field: el.path,
    message: el.message,
    value: el.value,
    kind: el.kind,
    reason: el.reason
}));
const error = new ValidationError('Validation Failed');
error.errors = errors;
error.code = 'VALIDATION_ERROR';
return error;
};

const handleZodError = (err: ZodError): AppError => {
const errors = err.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message,
    code: error.code
}));
const error = new ValidationError('Validation Failed');
error.errors = errors;
return error;
};
        field: el.path,
        message: el.message,
        value: el.value
    }));
    return new JoiValidationError(errors);
};

const handleJWTError = (err: JsonWebTokenError): AppError => {
return new AuthenticationError('Invalid token. Please log in again.');
};

const handleJWTExpiredError = (err: TokenExpiredError): AppError => {
return new AuthenticationError('Your token has expired. Please log in again.');
};

const handleCastError = (err: mongoose.Error.CastError): AppError => {
const message = `Invalid ${err.path}: ${err.value}`;
return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
const field = Object.keys(err.keyValue)[0];
const value = err.keyValue[field];
const message = `Duplicate field value: ${field} = ${value}. Please use another value.`;
return new ValidationError(message);
};

const sendErrorDev = (err: AppError, res: Response): void => {
const errorResponse: ErrorResponse = {
status: 'error',
statusCode: err.statusCode || 500,
message: err.message,
stack: err.stack,
errors: err,
path: (res as any).req.originalUrl,
timestamp: new Date().toISOString(),
correlationId: (req.headers['x-correlation-id'] as string) || crypto.randomUUID(),
requestId: req.headers['x-request-id'] as string,
errorType: err.constructor.name
};

res.status(err.statusCode || 500).json(errorResponse);
};

const sendErrorProd = (err: AppError, res: Response): void => {
// Operational, trusted error: send message to client
if (err.isOperational) {
    const errorResponse: ErrorResponse = {
    status: 'error',
    statusCode: err.statusCode,
    message: err.message,
    path: (res as any).req.originalUrl,
    timestamp: new Date().toISOString(),
    code: err.code || 'INTERNAL_SERVER_ERROR',
    correlationId: (res as any).req.headers['x-correlation-id'],
    errorType: err.constructor.name
    res.status(err.statusCode).json(errorResponse);
    
    // Log error to monitoring service in production
    // You would typically use a logging service like Winston here
    logger.error('Operational Error:', {
        timestamp: new Date().toISOString(),
        name: err.name,
        message: err.message,
        stackTrace: err.stack
    });
}
// Programming or other unknown error: don't leak error details
else {
    logger.error('Programming Error:', err);
    // Log error to monitoring service
    logger.error('Programming Error Details:', {
    timestamp: new Date().toISOString(),
    name: err.name,
    message: err.message,
    stackTrace: err.stack,
    path: (res as any).req.originalUrl
    });

    const errorResponse: ErrorResponse = {
    status: 'error',
    statusCode: 500,
    message: 'Something went wrong!',
    path: (res as any).req.originalUrl,
    timestamp: new Date().toISOString()
    };
    res.status(500).json(errorResponse);
}
};

export const errorHandler = (
err: Error,
req: Request,
res: Response,
next: NextFunction
): void => {
// Generate correlation ID if not exists
const correlationId = req.headers['x-correlation-id'] || 
    req.headers['x-request-id'] || 
    crypto.randomUUID();

// Log all errors with correlation ID and context
logger.error('Error occurred:', {
    correlationId,
    error: err,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    errorType: err.constructor.name
});

let error = err instanceof AppError ? err : new AppError(500, err.message, false);

// Handle specific error types
if (err instanceof ZodError) {
    error = handleZodError(err);
}

// Handle specific error types
if (err instanceof mongoose.Error.ValidationError) {
    error = handleMongooseValidationError(err);
}
if (err instanceof mongoose.Error.CastError) {
    error = handleCastError(err);
}
if (err instanceof JsonWebTokenError) {
    error = handleJWTError(err);
}
if (err instanceof TokenExpiredError) {
    error = handleJWTExpiredError(err);
}
if (err.name === 'MongoError' && (err as any).code === 11000) {
    error = handleDuplicateFieldsDB(err);
}

// Send error response based on environment
if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
} else {
    sendErrorProd(error, res);
}
};

// 404 handler
export const notFoundHandler = (
req: Request,
res: Response,
next: NextFunction
): void => {
next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server`));
};

