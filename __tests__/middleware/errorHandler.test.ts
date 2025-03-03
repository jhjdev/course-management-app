import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '@/middleware/errorHandler';
import { AppError } from '@/utils/errors';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

describe('Error Handler Middleware', () => {
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let nextFunction: NextFunction;

beforeEach(() => {
    mockRequest = {};
    mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
    // Reset NODE_ENV before each test
    process.env.NODE_ENV = 'development';
});

afterEach(() => {
    jest.clearAllMocks();
});

it('should handle AppError correctly', () => {
    const error = new AppError('Test error', 400);

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Test error'
    });
    expect(nextFunction).not.toHaveBeenCalled();
});

it('should handle mongoose ValidationError', () => {
    const error = new mongoose.Error.ValidationError();
    error.errors = {
    field: new mongoose.Error.ValidatorError({
        message: 'Field validation failed',
        path: 'field',
        type: 'required'
    } as any)
    };

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Validation Error',
    errors: { field: 'Field validation failed' }
    });
});

it('should handle JWT errors', () => {
    const error = new JsonWebTokenError('invalid token');

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Invalid token. Please log in again.'
    });
});

it('should handle JWT token expiration', () => {
    const error = new TokenExpiredError('Token expired', new Date());

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Your token has expired. Please log in again.'
    });
});

it('should handle mongoose CastError', () => {
    const error = new mongoose.Error.CastError('ObjectId', 'invalid_id', 'field');

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Invalid field: invalid_id'
    });
});

it('should handle mongoose duplicate key error', () => {
    const error = new mongoose.Error.MongoServerError({ code: 11000, keyValue: { email: 'test@example.com' } });

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Duplicate field value: email'
    });
});

it('should handle generic error in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Internal server error');

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Something went wrong'
    });
    // Should not expose error details in production
    expect(mockResponse.json).not.toHaveBeenCalledWith(
    expect.objectContaining({
        stack: expect.any(String)
    })
    );
});

it('should include error stack in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Internal server error');

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Internal server error',
    stack: expect.any(String)
    });
});

it('should sanitize error messages in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Sensitive database connection string: mongodb://user:pass@host');

    errorHandler(
    error,
    mockRequest as Request,
    mockResponse as Response,
    nextFunction
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
    status: 'error',
    message: 'Something went wrong'
    });
    expect(mockResponse.json).not.toHaveBeenCalledWith(
    expect.objectContaining({
        message: expect.stringContaining('mongodb://')
    })
    );
});
});
