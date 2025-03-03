import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface TrackedRequest extends Request {
correlationId?: string;
startTime?: number;
}

export const requestTracker = (
req: TrackedRequest,
res: Response,
next: NextFunction
) => {
// Generate correlation ID
req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
req.startTime = Date.now();

// Add correlation ID to response headers
res.setHeader('x-correlation-id', req.correlationId);

// Log incoming request
logger.info('Request received', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
});

// Log response time on finish
res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.info('Request completed', {
    correlationId: req.correlationId,
    duration,
    statusCode: res.statusCode,
    });
});

next();
};

