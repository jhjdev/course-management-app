import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, extractPayload } from '../../app/utils/jwt';
import { AuthenticationError } from '../../app/utils/errors';

// Mock environment variables
const mockJwtSecret = 'test-secret-key';
const originalEnv = process.env;

beforeEach(() => {
jest.resetModules();
process.env = { ...originalEnv };
process.env.JWT_SECRET = mockJwtSecret;
});

afterEach(() => {
process.env = originalEnv;
jest.clearAllMocks();
});

describe('JWT Utilities', () => {
describe('generateToken', () => {
    it('should generate a valid JWT token with user payload', async () => {
    const payload = { userId: '123', email: 'test@example.com' };
    const token = await generateToken(payload);
    
    expect(token).toBeDefined();
    const decoded = jwt.verify(token, mockJwtSecret) as typeof payload;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    });

    it('should generate token with custom expiration', async () => {
    const payload = { userId: '123' };
    const expiration = '1h';
    const token = await generateToken(payload, expiration);
    
    const decoded = jwt.verify(token, mockJwtSecret) as any;
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
    });

    it('should throw error if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    await expect(generateToken({ userId: '123' }))
        .rejects
        .toThrow('JWT secret is not configured');
    });
});

describe('verifyToken', () => {
    it('should successfully verify a valid token', async () => {
    const payload = { userId: '123' };
    const token = await generateToken(payload);
    
    const verified = await verifyToken(token);
    expect(verified).toMatchObject(payload);
    });

    it('should reject expired tokens', async () => {
    const payload = { userId: '123' };
    const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '0s' });
    
    await expect(verifyToken(token))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should reject malformed tokens', async () => {
    await expect(verifyToken('invalid-token'))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should reject tokens with invalid signatures', async () => {
    const token = jwt.sign({ userId: '123' }, 'wrong-secret');
    
    await expect(verifyToken(token))
        .rejects
        .toThrow(AuthenticationError);
    });
});

describe('extractPayload', () => {
    it('should extract payload from valid token', async () => {
    const payload = { userId: '123', role: 'user' };
    const token = await generateToken(payload);
    
    const extracted = await extractPayload(token);
    expect(extracted).toMatchObject(payload);
    });

    it('should maintain type safety for payload', async () => {
    interface UserPayload {
        userId: string;
        role: 'admin' | 'user';
    }
    
    const payload: UserPayload = { userId: '123', role: 'admin' };
    const token = await generateToken(payload);
    
    const extracted = await extractPayload<UserPayload>(token);
    expect(extracted.role).toBe('admin');
    });

    it('should handle invalid token format', async () => {
    await expect(extractPayload('invalid-format'))
        .rejects
        .toThrow(AuthenticationError);
    });
});
});

