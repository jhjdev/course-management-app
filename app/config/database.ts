import mongoose from 'mongoose';
import type { ConnectOptions } from 'mongoose';
import dotenv from 'dotenv';

// Configure dotenv to read environment variables
dotenv.config();

const connectDB = async () => {
try {
    const options: ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    family: 4, // Use IPv4, skip trying IPv6
    retryWrites: true,
    retryReads: true,
    w: 'majority',
    ssl: process.env.NODE_ENV === 'production',
    keepAlive: true,
    connectTimeoutMS: 30000,
    };

    if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on('error', err => {
    console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    // Attempt to reconnect
    setTimeout(() => {
        console.log('Attempting to reconnect to MongoDB...');
        connectDB();
    }, 5000);
    });

    mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
    });

    mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
    });

    return conn;
    
} catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Attempt to reconnect on failure
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(() => {
    connectDB();
    }, 5000);
    throw error;
}
};

export default connectDB;
