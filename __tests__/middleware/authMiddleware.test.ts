import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, isInstructor, isAdmin } from '../../app/middleware/auth';
import { User } from '../../app/models/User';

// Mock jwt and User model
jest.mock('jsonwebtoken');
jest.mock('../../app/models/User');

describe('Auth Middleware', () => {
let mockReq: Partial<Request>;
let mockRes: Partial<Response>;
let nextFunction: NextFunction;

beforeEach(() => {
    mockReq = {
    headers: {},
    user: undefined
    };
    mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
    };
    nextFunction = jest.fn();
});

describe('authenticate middleware', () => {
    it('should authenticate valid JWT token', async () => {
    const mockUser = { _id: '123', email: 'test@test.com', role: 'user' };
    const mockToken = 'valid.jwt.token';
    
    mockReq.headers = { authorization: `Bearer ${mockToken}` };
    (jwt.verify as jest.Mock).mockReturnValue({ id: mockUser._id });
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    await authenticate(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.user).toEqual(mockUser);
    });

    it('should handle missing authorization header', async () => {
    await authenticate(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No authorization token provided'
    });
    });

    it('should handle invalid token format', async () => {
    mockReq.headers = { authorization: 'InvalidFormat' };

    await authenticate(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token format'
    });
    });

    it('should handle expired tokens', async () => {
    mockReq.headers = { authorization: 'Bearer expired.token' };
    (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
    });

    await authenticate(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired'
    });
    });
});

describe('requireRole middleware', () => {
    it('should allow access for correct role', async () => {
    mockReq.user = { role: 'admin' };
    
    await requireRole('admin')(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for incorrect role', async () => {
    mockReq.user = { role: 'user' };
    
    await requireRole('admin')(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied'
    });
    });
});

describe('isInstructor middleware', () => {
    it('should allow access for instructor', async () => {
    mockReq.user = { role: 'instructor' };
    
    await isInstructor(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for non-instructor', async () => {
    mockReq.user = { role: 'student' };
    
    await isInstructor(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    });
});

describe('isAdmin middleware', () => {
    it('should allow access for admin', async () => {
    mockReq.user = { role: 'admin' };
    
    await isAdmin(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for non-admin', async () => {
    mockReq.user = { role: 'user' };
    
    await isAdmin(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    });
});

describe('middleware chaining', () => {
    it('should successfully chain authentication and role check', async () => {
    const mockUser = { _id: '123', email: 'test@test.com', role: 'admin' };
    const mockToken = 'valid.jwt.token';
    
    mockReq.headers = { authorization: `Bearer ${mockToken}` };
    (jwt.verify as jest.Mock).mockReturnValue({ id: mockUser._id });
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    await authenticate(mockReq as Request, mockRes as Response, nextFunction);
    await isAdmin(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(2);
    });
});
});

