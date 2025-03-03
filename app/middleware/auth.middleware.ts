import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { AuthService } from '../services/authService';
import { TokenExpiredError } from '../utils/errors';

export interface AuthRequest extends Request {
user?: {
    id: string;
    roles: string[];
    sessionId: string;
};
}

export const authenticate = async (
req: AuthRequest,
res: Response,
next: NextFunction
) => {
try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
    throw new UnauthorizedError('No token provided');
    }

    // Get or create AuthService instance
    const authService = new AuthService();

    try {
    // Verify token and session
    const decoded = await authService.verifyToken(token);
    const isValidSession = await authService.validateSession(decoded.sessionId);

    if (!isValidSession) {
        throw new UnauthorizedError('Invalid or expired session');
    }

    req.user = decoded;

    // Check token expiration
    if (await authService.isTokenNearingExpiry(token)) {
        const newToken = await authService.refreshToken(token);
        res.setHeader('X-New-Token', newToken);
    }

    next();
    } catch (error) {
    if (error instanceof TokenExpiredError) {
        // Handle expired token
        const refreshToken = req.headers['x-refresh-token'];
        if (refreshToken && typeof refreshToken === 'string') {
        try {
            const newToken = await authService.refreshToken(refreshToken);
            res.setHeader('X-New-Token', newToken);
            const decoded = await authService.verifyToken(newToken);
            req.user = decoded;
            return next();
        } catch (refreshError) {
            logger.error('Token refresh failed', { error: refreshError });
            throw new UnauthorizedError('Token refresh failed');
        }
        }
    }
    throw error;
    }
} catch (error) {
logger.error('Authentication failed', { error });
if (error instanceof TokenExpiredError) {
    next(new UnauthorizedError('Token has expired'));
} else {
    next(new UnauthorizedError('Invalid token'));
}
}
};

export const authorize = (allowedRoles: string[]) => {
return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
    return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
};
};

