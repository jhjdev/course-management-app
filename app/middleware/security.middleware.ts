import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// Rate limiting configuration
export const rateLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100, // limit each IP to 100 requests per windowMs
message: 'Too many requests from this IP, please try again later',
handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    });
    res.status(429).json({
    error: 'Too many requests, please try again later',
    });
},
});

// CORS configuration
export const corsOptions = cors({
origin: config.cors.allowedOrigins,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
exposedHeaders: ['x-correlation-id'],
credentials: true,
maxAge: 86400, // 24 hours
});

// Security headers using helmet
export const securityHeaders = helmet({
contentSecurityPolicy: {
    directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    },
},
hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
},
});

// Request sanitization
export const sanitizeRequest = (
req: Request,
res: Response,
next: NextFunction
) => {
// Sanitize request body
if (req.body) {
    Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
    }
    });
}

// Sanitize query parameters
if (req.query) {
    Object.keys(req.query).forEach(key => {
    if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).trim();
    }
    });
}

next();
};

