import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';

// Initialize express app
const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes will be registered here
// app.use('/api/v1/courses', courseRouter);
// app.use('/api/v1/users', userRouter);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
res.status(404).json({
    status: 'error',
    message: 'Not Found',
    path: req.path
});
});

// Error handling middleware
app.use(errorHandler);

export default app;

