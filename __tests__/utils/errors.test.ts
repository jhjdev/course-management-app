import {
AppError,
ValidationError,
AuthenticationError,
NotFoundError,
DatabaseError
} from '../../app/utils/errors';

describe('Error Utilities', () => {
describe('Base AppError', () => {
    it('should create an AppError with default status code', () => {
    const error = new AppError('Generic error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Generic error');
    });

    it('should create an AppError with custom status code', () => {
    const error = new AppError('Custom error', 418);
    expect(error.statusCode).toBe(418);
    });

    it('should serialize to a proper error response object', () => {
    const error = new AppError('Serialized error', 400);
    const serialized = error.toJSON();
    expect(serialized).toEqual({
        status: 'error',
        statusCode: 400,
        message: 'Serialized error'
    });
    });
});

describe('ValidationError', () => {
    it('should create a ValidationError with correct defaults', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
    });

    it('should handle validation details in message', () => {
    const details = { field: 'email', message: 'Invalid email format' };
    const error = new ValidationError('Validation failed', details);
    expect(error.details).toEqual(details);
    });
});

describe('AuthenticationError', () => {
    it('should create an AuthenticationError with correct defaults', () => {
    const error = new AuthenticationError('Invalid credentials');
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid credentials');
    });

    it('should maintain proper error hierarchy', () => {
    const error = new AuthenticationError('Unauthorized');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof AuthenticationError).toBe(true);
    expect(error instanceof ValidationError).toBe(false);
    });
});

describe('NotFoundError', () => {
    it('should create a NotFoundError with correct defaults', () => {
    const error = new NotFoundError('Resource not found');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
    });

    it('should handle resource type in message', () => {
    const error = new NotFoundError('User not found', 'user');
    expect(error.message).toBe('User not found');
    expect(error.resourceType).toBe('user');
    });
});

describe('DatabaseError', () => {
    it('should create a DatabaseError with correct defaults', () => {
    const error = new DatabaseError('Database connection failed');
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(503);
    expect(error.message).toBe('Database connection failed');
    });

    it('should handle original error object', () => {
    const originalError = new Error('MongoDB connection error');
    const error = new DatabaseError('Database error occurred', originalError);
    expect(error.originalError).toBe(originalError);
    });
});

describe('Error Response Formatting', () => {
    it('should format all error types consistently', () => {
    const errors = [
        new ValidationError('Invalid data'),
        new AuthenticationError('Unauthorized access'),
        new NotFoundError('Resource not found'),
        new DatabaseError('Database error')
    ];

    errors.forEach(error => {
        const response = error.toJSON();
        expect(response).toHaveProperty('status', 'error');
        expect(response).toHaveProperty('statusCode');
        expect(response).toHaveProperty('message');
    });
    });

    it('should include error details when available', () => {
    const details = { field: 'password', message: 'Too short' };
    const error = new ValidationError('Validation failed', details);
    const response = error.toJSON();
    expect(response).toHaveProperty('details', details);
    });
});
});

