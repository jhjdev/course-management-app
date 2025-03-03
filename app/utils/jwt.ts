import jwt from 'jsonwebtoken';

// Custom error for authentication failures
export class AuthenticationError extends Error {
constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
}
}

// Generic interface for JWT payload
export interface JWTPayload {
userId: string;
email: string;
role: string;
[key: string]: any;
}

/**
* Generates a JWT token from the provided payload
* @param payload Data to be encoded in the token
* @param expiresIn Optional expiration time (default: '24h')
* @returns Signed JWT token
* @throws Error if JWT_SECRET is not configured
*/
export const generateToken = <T extends JWTPayload>(
payload: T,
expiresIn: string = '24h'
): string => {
const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}

return jwt.sign(payload, secret, { expiresIn });
};

/**
* Verifies a JWT token and returns the decoded payload
* @param token JWT token to verify
* @returns Decoded token payload
* @throws AuthenticationError for invalid or expired tokens
*/
export const verifyToken = <T extends JWTPayload>(token: string): T => {
const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}

try {
    const decoded = jwt.verify(token, secret) as T;
    return decoded;
} catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
    throw new AuthenticationError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
    throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
}
};

/**
* Extracts and validates the payload from a token without verifying signature
* @param token JWT token
* @returns Decoded token payload
* @throws AuthenticationError for malformed tokens
*/
export const extractPayload = <T extends JWTPayload>(token: string): T => {
try {
    // Note: This doesn't verify the signature, just decodes the payload
    const decoded = jwt.decode(token) as T;
    if (!decoded) {
    throw new AuthenticationError('Invalid token format');
    }
    return decoded;
} catch (error) {
    throw new AuthenticationError('Failed to extract payload from token');
}
};

