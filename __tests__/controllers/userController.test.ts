import { Request, Response } from 'express';
import { UserController } from '../../app/controllers/userController';
import { User } from '../../app/models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Mock User model
jest.mock('../../app/models/User');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

describe('UserController', () => {
let userController: UserController;
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let mockUser: any;

beforeEach(() => {
    userController = new UserController();
    mockResponse = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    };
    mockUser = {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    save: jest.fn(),
    };
    
    // Reset mocks
    jest.clearAllMocks();
});

describe('register', () => {
    beforeEach(() => {
    mockRequest = {
        body: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        },
    };
    });

    it('should successfully register a new user', async () => {
    // Mock User.findOne to return null (no existing user)
    (User.findOne as jest.Mock).mockResolvedValue(null);
    // Mock bcrypt hash
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    // Mock User.create
    (User.create as jest.Mock).mockResolvedValue(mockUser);
    // Mock JWT sign
    (jwt.sign as jest.Mock).mockReturnValue('mockToken');

    await userController.register(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
        token: 'mockToken',
        user: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
        }),
        },
    });
    });

    it('should return 400 if email already exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    await userController.register(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already registered',
    });
    });

    it('should return 400 if required fields are missing', async () => {
    mockRequest.body = {};

    await userController.register(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Please provide all required fields',
    });
    });
});

describe('login', () => {
    beforeEach(() => {
    mockRequest = {
        body: {
        email: 'test@example.com',
        password: 'password123',
        },
    };
    });

    it('should successfully login a user', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mockToken');

    await userController.login(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
        token: 'mockToken',
        user: expect.objectContaining({
            email: 'test@example.com',
        }),
        },
    });
    });

    it('should return 401 for invalid credentials', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await userController.login(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials',
    });
    });

    it('should return 404 if user not found', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await userController.login(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
    });
    });
});

describe('updateProfile', () => {
    beforeEach(() => {
    mockRequest = {
        params: { id: mockUser._id.toString() },
        body: {
        name: 'Updated Name',
        email: 'updated@example.com',
        },
        user: mockUser, // Simulating authenticated user
    };
    });

    it('should successfully update user profile', async () => {
    const updatedUser = { ...mockUser, ...mockRequest.body };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    mockUser.save.mockResolvedValue(updatedUser);

    await userController.updateProfile(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
        name: 'Updated Name',
        email: 'updated@example.com',
        }),
    });
    });

    it('should return 404 if user not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    await userController.updateProfile(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
    });
    });
});

describe('resetPassword', () => {
    beforeEach(() => {
    mockRequest = {
        body: {
        email: 'test@example.com',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
        },
        user: mockUser,
    };
    });

    it('should successfully reset password', async () => {
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
    mockUser.save.mockResolvedValue({ ...mockUser, password: 'newHashedPassword' });

    await userController.resetPassword(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully',
    });
    });

    it('should return 401 if current password is incorrect', async () => {
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await userController.resetPassword(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is incorrect',
    });
    });
});
});

