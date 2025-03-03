import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { CourseService } from './services/CourseService';
import { CourseRepository } from './repositories/CourseRepository';
import { initializeRoutes } from './api/routes';
import { errorHandler } from './middleware/errorHandler';
import { connectDB } from './config/database';
import { securityMiddleware } from './middleware/security.middleware';
import { requestTrackerMiddleware } from './middleware/requestTracker.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { config } from './config/config';
import { logger } from './utils/logger';

interface AppConfig {
port: number;
corsOrigin: string;
environment: string;
apiVersion: string;
}

// Load environment variables
dotenv.config();

// Application configuration
const config: AppConfig = {
port: Number(process.env.PORT) || 3000,
corsOrigin: process.env.CORS_ORIGIN || '*',
environment: process.env.NODE_ENV || 'development',
apiVersion: process.env.API_VERSION || 'v1'
};

// Initialize express app
const app: Application = express();

// Apply security middleware first
app.use(securityMiddleware());

// Request tracking
app.use(requestTrackerMiddleware());

// Body parsing and compression
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation and auth middleware
app.use(validationMiddleware());
app.use(authMiddleware());

// Initialize services and repositories
const courseRepository = new CourseRepository();
const courseService = new CourseService(courseRepository);

// Initialize and mount API routes
const routes = initializeRoutes({
courseService
});

app.use(`/api/${config.apiVersion}`, routes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.environment,
    version: config.apiVersion
});
});

// Error handling
// Not Found handler
app.use((req: Request, res: Response, next: NextFunction) => {
const error: any = new Error('Resource not found');
error.status = 404;
error.code = 'NOT_FOUND';
next(error);
});

// Global error handler
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection:', { reason, promise });
    process.exit(1);
});

// Connect to database and start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Successfully connected to MongoDB');

    app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    });
} catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
}
};

startServer();

export default app;

