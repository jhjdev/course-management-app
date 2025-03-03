import { Request, Response } from 'express';
import { CourseController } from '../../app/controllers/courseController';
import { Course } from '../../app/models/Course';
import { User } from '../../app/models/User';
import { CourseRepository } from '../../app/repositories/CourseRepository';

// Mock repositories and models
jest.mock('../../app/models/Course');
jest.mock('../../app/models/User');
jest.mock('../../app/repositories/CourseRepository');

describe('CourseController', () => {
let courseController: CourseController;
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let mockNext: jest.Mock;

beforeEach(() => {
    mockRequest = {
    body: {},
    params: {},
    query: {},
    user: { id: 'mockUserId', role: 'instructor' }
    };
    mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
    };
    mockNext = jest.fn();
    courseController = new CourseController(new CourseRepository());
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('createCourse', () => {
    const mockCourseData = {
    title: 'Test Course',
    description: 'Test Description',
    price: 99.99,
    category: 'programming'
    };

    it('should create a course successfully', async () => {
    mockRequest.body = mockCourseData;
    jest.spyOn(CourseRepository.prototype, 'create').mockResolvedValueOnce({
        ...mockCourseData,
        id: 'mockCourseId',
        creator: 'mockUserId'
    });

    await courseController.createCourse(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining(mockCourseData));
    });

    it('should return 400 for invalid course data', async () => {
    mockRequest.body = { title: '' };
    await courseController.createCourse(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('getAllCourses', () => {
    const mockCourses = [
    { id: '1', title: 'Course 1' },
    { id: '2', title: 'Course 2' }
    ];

    it('should return all courses with pagination', async () => {
    mockRequest.query = { page: '1', limit: '10' };
    jest.spyOn(CourseRepository.prototype, 'findAll').mockResolvedValueOnce({
        courses: mockCourses,
        total: 2,
        page: 1,
        limit: 10
    });

    await courseController.getAllCourses(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        courses: mockCourses,
        total: 2,
        page: 1,
        limit: 10
    });
    });

    it('should handle filtering by category', async () => {
    mockRequest.query = { category: 'programming' };
    await courseController.getAllCourses(mockRequest as Request, mockResponse as Response, mockNext);
    expect(CourseRepository.prototype.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'programming' })
    );
    });
});

describe('getCourseById', () => {
    const mockCourse = {
    id: 'mockCourseId',
    title: 'Test Course',
    description: 'Test Description'
    };

    it('should return course by id', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValueOnce(mockCourse);

    await courseController.getCourseById(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(mockCourse);
    });

    it('should return 404 for non-existent course', async () => {
    mockRequest.params = { id: 'nonexistentId' };
    jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValueOnce(null);

    await courseController.getCourseById(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('updateCourse', () => {
    const mockUpdateData = {
    title: 'Updated Course',
    description: 'Updated Description'
    };

    it('should update course successfully', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    mockRequest.body = mockUpdateData;
    jest.spyOn(CourseRepository.prototype, 'update').mockResolvedValueOnce({
        id: 'mockCourseId',
        ...mockUpdateData
    });

    await courseController.updateCourse(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining(mockUpdateData));
    });

    it('should deny update for non-creator', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    mockRequest.user = { id: 'differentUserId', role: 'instructor' };
    
    await courseController.updateCourse(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    jest.spyOn(CourseRepository.prototype, 'delete').mockResolvedValueOnce(true);

    await courseController.deleteCourse(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 for non-existent course', async () => {
    mockRequest.params = { id: 'nonexistentId' };
    jest.spyOn(CourseRepository.prototype, 'delete').mockResolvedValueOnce(false);

    await courseController.deleteCourse(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('enrollInCourse', () => {
    it('should enroll user in course successfully', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    jest.spyOn(CourseRepository.prototype, 'enrollStudent').mockResolvedValueOnce({
        success: true,
        message: 'Enrolled successfully'
    });

    await courseController.enrollInCourse(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
    }));
    });

    it('should prevent duplicate enrollment', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    jest.spyOn(CourseRepository.prototype, 'enrollStudent').mockRejectedValueOnce(new Error('Already enrolled'));

    await courseController.enrollInCourse(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('unenrollFromCourse', () => {
    it('should unenroll user from course successfully', async () => {
    mockRequest.params = { id: 'mockCourseId' };
    jest.spyOn(CourseRepository.prototype, 'unenrollStudent').mockResolvedValueOnce({
        success: true,
        message: 'Unenrolled successfully'
    });

    await courseController.unenrollFromCourse(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
    }));
    });
});
});

