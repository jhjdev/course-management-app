import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { LessonController } from '../../app/controllers/lessonController';
import { UserRepository } from '../../app/repositories/UserRepository';
import { CourseRepository } from '../../app/repositories/CourseRepository';
import { LessonRepository } from '../../app/repositories/LessonRepository';

jest.mock('../../app/repositories/UserRepository');
jest.mock('../../app/repositories/CourseRepository');
jest.mock('../../app/repositories/LessonRepository');

describe('LessonController', () => {
let lessonController: LessonController;
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let mockNext: jest.Mock;

const mockUser = {
    _id: new Types.ObjectId(),
    email: 'instructor@test.com',
    role: 'instructor'
};

const mockCourse = {
    _id: new Types.ObjectId(),
    title: 'Test Course',
    creator: mockUser._id
};

const mockLesson = {
    _id: new Types.ObjectId(),
    title: 'Test Lesson',
    content: 'Lesson content',
    courseId: mockCourse._id,
    order: 1
};

beforeEach(() => {
    mockRequest = {
    user: mockUser,
    params: {},
    body: {}
    };
    
    mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
    };
    
    mockNext = jest.fn();

    lessonController = new LessonController(
    new UserRepository(),
    new CourseRepository(),
    new LessonRepository()
    );
});

describe('createLesson', () => {
    it('should create a lesson when instructor is course creator', async () => {
    mockRequest.params = { courseId: mockCourse._id.toString() };
    mockRequest.body = {
        title: 'New Lesson',
        content: 'Content',
        order: 1
    };

    jest.spyOn(CourseRepository.prototype, 'findById')
        .mockResolvedValue(mockCourse);
    
    jest.spyOn(LessonRepository.prototype, 'create')
        .mockResolvedValue(mockLesson);

    await lessonController.createLesson(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLesson
    });
    });

    it('should return 403 when user is not course creator', async () => {
    mockRequest.user = { ...mockUser, _id: new Types.ObjectId() };
    mockRequest.params = { courseId: mockCourse._id.toString() };

    jest.spyOn(CourseRepository.prototype, 'findById')
        .mockResolvedValue(mockCourse);

    await lessonController.createLesson(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
});

describe('getLesson', () => {
    it('should return lesson details', async () => {
    mockRequest.params = { id: mockLesson._id.toString() };

    jest.spyOn(LessonRepository.prototype, 'findById')
        .mockResolvedValue(mockLesson);

    await lessonController.getLesson(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLesson
    });
    });

    it('should return 404 for non-existent lesson', async () => {
    mockRequest.params = { id: new Types.ObjectId().toString() };

    jest.spyOn(LessonRepository.prototype, 'findById')
        .mockResolvedValue(null);

    await lessonController.getLesson(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
});

describe('updateLesson', () => {
    it('should update lesson when instructor is course creator', async () => {
    const updatedLesson = { ...mockLesson, title: 'Updated Title' };
    mockRequest.params = { id: mockLesson._id.toString() };
    mockRequest.body = { title: 'Updated Title' };

    jest.spyOn(LessonRepository.prototype, 'findById')
        .mockResolvedValue(mockLesson);
    jest.spyOn(CourseRepository.prototype, 'findById')
        .mockResolvedValue(mockCourse);
    jest.spyOn(LessonRepository.prototype, 'update')
        .mockResolvedValue(updatedLesson);

    await lessonController.updateLesson(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedLesson
    });
    });
});

describe('deleteLesson', () => {
    it('should delete lesson when instructor is course creator', async () => {
    mockRequest.params = { id: mockLesson._id.toString() };

    jest.spyOn(LessonRepository.prototype, 'findById')
        .mockResolvedValue(mockLesson);
    jest.spyOn(CourseRepository.prototype, 'findById')
        .mockResolvedValue(mockCourse);
    jest.spyOn(LessonRepository.prototype, 'delete')
        .mockResolvedValue(mockLesson);

    await lessonController.deleteLesson(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
});

describe('markLessonComplete', () => {
    it('should mark lesson as complete for enrolled student', async () => {
    mockRequest.params = { id: mockLesson._id.toString() };
    mockRequest.user = { ...mockUser, role: 'student' };

    jest.spyOn(LessonRepository.prototype, 'findById')
        .mockResolvedValue(mockLesson);
    jest.spyOn(CourseRepository.prototype, 'isStudentEnrolled')
        .mockResolvedValue(true);
    jest.spyOn(LessonRepository.prototype, 'markComplete')
        .mockResolvedValue(true);

    await lessonController.markLessonComplete(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 for non-enrolled student', async () => {
    mockRequest.params = { id: mockLesson._id.toString() };
    mockRequest.user = { ...mockUser, role: 'student' };

    jest.spyOn(LessonRepository.prototype, 'findById')
        .mockResolvedValue(mockLesson);
    jest.spyOn(CourseRepository.prototype, 'isStudentEnrolled')
        .mockResolvedValue(false);

    await lessonController.markLessonComplete(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
});

describe('getLessonsByCourse', () => {
    it('should return ordered list of lessons for a course', async () => {
    const mockLessons = [
        { ...mockLesson, order: 1 },
        { ...mockLesson, _id: new Types.ObjectId(), order: 2 }
    ];
    
    mockRequest.params = { courseId: mockCourse._id.toString() };

    jest.spyOn(CourseRepository.prototype, 'findById')
        .mockResolvedValue(mockCourse);
    jest.spyOn(LessonRepository.prototype, 'findByCourse')
        .mockResolvedValue(mockLessons);

    await lessonController.getLessonsByCourse(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLessons
    });
    });
});
});

