import { createServer } from 'http';
import mongoose from 'mongoose';
import { app } from './app/app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coursesdb';

// Configure MongoDB connection
mongoose.connection.on('error', (err) => {
console.error(`MongoDB connection error: ${err}`);
process.exit(1);
});

mongoose.connection.on('connected', () => {
console.log('Successfully connected to MongoDB');
});

// Create HTTP server
const server = createServer(app);

// Database connection with retry logic
async function connectDB(retries = 5, interval = 5000): Promise<void> {
try {
    await mongoose.connect(MONGODB_URI);
} catch (error) {
    if (retries === 0) {
    console.error('Failed to connect to MongoDB. Exiting...');
    process.exit(1);
    }
    console.log(`Failed to connect to MongoDB. Retrying in ${interval}ms...`);
    setTimeout(() => connectDB(retries - 1, interval), interval);
}
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
console.log(`Received ${signal}. Starting graceful shutdown...`);

try {
    // Stop accepting new connections
    server.close(async () => {
    console.log('HTTP server closed');
    
    try {
        // Close database connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB disconnect:', err);
        process.exit(1);
    }
    });

    // Force shutdown after timeout
    setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
    }, 10000);

} catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
}
}

// Start server
async function startServer(): Promise<void> {
try {
    await connectDB();
    
    server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
    });

} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}
}

startServer();

