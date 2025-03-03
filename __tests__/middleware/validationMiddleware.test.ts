import { Request, Response, NextFunction } from 'express';
import { validateUserRegistration, validateUserLogin, validateCourseCreation, validateCourseUpdate, validateLessonCreation } from '../../app/middleware/validationMiddleware';
import { ValidationError } from '../../app/utils/errors';

describe('Validation Middleware', () => {
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let nextFunction: NextFunction;

beforeEach(() => {
    mockRequest = {
    body: {}
    };
    mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
    };
    nextFunction = jest.fn();
});

describe('User Registration Validation', () => {
    it('should pass validation with valid registration data', async () => {
    mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
    };

    await validateUserRegistration(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should fail validation with invalid email format', async () => {
    mockRequest.body = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User'
    };

    await validateUserRegistration(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });

    it('should fail validation with weak password', async () => {
    mockRequest.body = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
    };

    await validateUserRegistration(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });

    it('should fail validation with missing required fields', async () => {
    mockRequest.body = {
        email: 'test@example.com'
    };

    await validateUserRegistration(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });
});

describe('User Login Validation', () => {
    it('should pass validation with valid login credentials', async () => {
    mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123!'
    };

    await validateUserLogin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should fail validation with missing email', async () => {
    mockRequest.body = {
        password: 'Password123!'
    };

    await validateUserLogin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });

    it('should fail validation with missing password', async () => {
    mockRequest.body = {
        email: 'test@example.com'
    };

    await validateUserLogin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });
});

describe('Course Creation Validation', () => {
    it('should pass validation with valid course data', async () => {
    mockRequest.body = {
        title: 'Test Course',
        description: 'Course description',
        category: 'Programming',
        difficulty: 'Intermediate',
        price: 29.99
    };

    await validateCourseCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should fail validation with missing required fields', async () => {
    mockRequest.body = {
        title: 'Test Course'
    };

    await validateCourseCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });

    it('should fail validation with invalid price format', async () => {
    mockRequest.body = {
        title: 'Test Course',
        description: 'Course description',
        category: 'Programming',
        difficulty: 'Intermediate',
        price: 'invalid'
    };

    await validateCourseCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });
});

describe('Course Update Validation', () => {
    it('should pass validation with valid update data', async () => {
    mockRequest.body = {
        title: 'Updated Course Title',
        description: 'Updated description'
    };

    await validateCourseUpdate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should fail validation with invalid field types', async () => {
    mockRequest.body = {
        price: 'invalid',
        difficulty: 123
    };

    await validateCourseUpdate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });
});

describe('Lesson Creation Validation', () => {
    it('should pass validation with valid lesson data', async () => {
    mockRequest.body = {
        title: 'Test Lesson',
        content: 'Lesson content',
        order: 1,
        courseId: '507f1f77bcf86cd799439011'
    };

    await validateLessonCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should fail validation with missing required fields', async () => {
    mockRequest.body = {
        title: 'Test Lesson'
    };

    await validateLessonCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });

    it('should fail validation with invalid order value', async () => {
    mockRequest.body = {
        title: 'Test Lesson',
        content: 'Lesson content',
        order: -1,
        courseId: '507f1f77bcf86cd799439011'
    };

    await validateLessonCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });

    it('should fail validation with invalid courseId format', async () => {
    mockRequest.body = {
        title: 'Test Lesson',
        content: 'Lesson content',
        order: 1,
        courseId: 'invalid-id'
    };

    await validateLessonCreation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ValidationError)
    );
    });
});
});

