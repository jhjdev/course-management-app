import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import config from '../config/config';
import { redis } from '../lib/redis';

export interface TokenPayload {
userId: string;
roles: string[];
sessionId: string;
}

export interface AuthTokens {
accessToken: string;
refreshToken: string;
}

export class AuthService {
private readonly SALT_ROUNDS = 10;
private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
private readonly PASSWORD_RESET_PREFIX = 'password:reset:';
private readonly SESSION_PREFIX = 'session:';

constructor(
    private readonly accessTokenExpiry: string = '15m',
    private readonly refreshTokenExpiry: string = '7d'
) {}

async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
}

async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

async generateAuthTokens(user: User): Promise<AuthTokens> {
    const sessionId = crypto.randomUUID();
    
    const payload: TokenPayload = {
    userId: user._id.toString(),
    roles: user.roles,
    sessionId
    };

    const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(payload, config.auth.refreshSecret, {
    expiresIn: this.refreshTokenExpiry
    });

    // Store session info in Redis
    await this.storeSession(sessionId, user._id.toString());

    return { accessToken, refreshToken };
}

async login(email: string, password: string): Promise<AuthTokens> {
    const user = await User.findOne({ email });
    if (!user) {
    throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
    }

    if (!user.isEmailVerified) {
    throw new AppError('Email not verified', 403);
    }

    return this.generateAuthTokens(user);
}

async logout(userId: string, sessionId: string): Promise<void> {
    await Promise.all([
    redis.del(`${this.SESSION_PREFIX}${sessionId}`),
    redis.del(`${this.SESSION_PREFIX}${userId}:active`)
    ]);
}

async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
    const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as TokenPayload;
    
    // Check if session is valid
    const isValidSession = await this.verifySession(payload.sessionId);
    if (!isValidSession) {
        throw new AppError('Invalid session', 401);
    }

    const user = await User.findById(payload.userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    return this.generateAuthTokens(user);
    } catch (error) {
    throw new AppError('Invalid refresh token', 401);
    }
}

async initiatePasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
    // Return success even if user not found for security
    return;
    }

    const resetToken = crypto.randomUUID();
    await redis.setex(
    `${this.PASSWORD_RESET_PREFIX}${resetToken}`,
    3600, // 1 hour expiry
    user._id.toString()
    );

    // TODO: Send password reset email
    logger.info(`Password reset initiated for user: ${user._id}`);
}

async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const userId = await redis.get(`${this.PASSWORD_RESET_PREFIX}${resetToken}`);
    if (!userId) {
    throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
    throw new AppError('User not found', 404);
    }

    user.password = await this.hashPassword(newPassword);
    await user.save();

    // Invalidate all existing sessions
    await this.invalidateUserSessions(userId);

    await redis.del(`${this.PASSWORD_RESET_PREFIX}${resetToken}`);
    logger.info(`Password reset completed for user: ${userId}`);
}

private async storeSession(sessionId: string, userId: string): Promise<void> {
    await Promise.all([
    redis.setex(
        `${this.SESSION_PREFIX}${sessionId}`,
        604800, // 7 days in seconds
        userId
    ),
    redis.setex(
        `${this.SESSION_PREFIX}${userId}:active`,
        604800,
        sessionId
    )
    ]);
}

private async verifySession(sessionId: string): Promise<boolean> {
    const exists = await redis.exists(`${this.SESSION_PREFIX}${sessionId}`);
    return exists === 1;
}

private async invalidateUserSessions(userId: string): Promise<void> {
    const sessionId = await redis.get(`${this.SESSION_PREFIX}${userId}:active`);
    if (sessionId) {
    await Promise.all([
        redis.del(`${this.SESSION_PREFIX}${sessionId}`),
        redis.del(`${this.SESSION_PREFIX}${userId}:active`)
    ]);
    }
}

async verifyToken(token: string): Promise<TokenPayload> {
    try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
    
    // Check if session is still valid
    const isValidSession = await this.verifySession(payload.sessionId);
    if (!isValidSession) {
        throw new AppError('Invalid session', 401);
    }

    return payload;
    } catch (error) {
    throw new AppError('Invalid token', 401);
    }
}

async validatePassword(password: string): Promise<boolean> {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
    );
}
}

