import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

// Types and interfaces
export interface PaginationParams {
page: number;
limit: number;
totalItems: number;
}

export interface PaginationResult<T> {
data: T[];
pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
};
}

export interface ApiResponse<T> {
success: boolean;
data?: T;
error?: string;
message?: string;
}

// Password handling functions
/**
* Hashes a password using bcrypt
* @param password - Plain text password to hash
* @returns Promise<string> - Hashed password
*/
export const hashPassword = async (password: string): Promise<string> => {
const saltRounds = 10;
return bcrypt.hash(password, saltRounds);
};

/**
* Compares a plain text password with a hashed password
* @param password - Plain text password to compare
* @param hashedPassword - Hashed password to compare against
* @returns Promise<boolean> - True if passwords match
*/
export const comparePassword = async (
password: string,
hashedPassword: string
): Promise<boolean> => {
return bcrypt.compare(password, hashedPassword);
};

// JWT functions
/**
* Generates a JWT token
* @param payload - Data to encode in the token
* @param expiresIn - Token expiration time
* @returns string - JWT token
*/
export const generateToken = (
payload: object,
expiresIn: string = '24h'
): string => {
const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
return jwt.sign(payload, secret, { expiresIn });
};

/**
* Verifies a JWT token
* @param token - Token to verify
* @returns Promise<any> - Decoded token payload
*/
export const verifyToken = (token: string): Promise<any> => {
const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
    if (err) reject(err);
    resolve(decoded);
    });
});
};

// Email validation
/**
* Validates an email address format
* @param email - Email address to validate
* @returns boolean - True if email is valid
*/
export const isValidEmail = (email: string): boolean => {
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return emailRegex.test(email);
};

// Date formatting
/**
* Formats a date to a standard string format
* @param date - Date to format
* @returns string - Formatted date string
*/
export const formatDate = (date: Date): string => {
return date.toISOString().split('T')[0];
};

/**
* Formats a timestamp to a readable format
* @param date - Date to format
* @returns string - Formatted timestamp
*/
export const formatTimestamp = (date: Date): string => {
return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
}).format(date);
};

// Response formatting
/**
* Creates a standardized success response
* @param data - Data to include in response
* @param message - Optional success message
* @returns ApiResponse - Formatted success response
*/
export const successResponse = <T>(
data: T,
message?: string
): ApiResponse<T> => ({
success: true,
data,
message,
});

/**
* Creates a standardized error response
* @param error - Error message or object
* @returns ApiResponse - Formatted error response
*/
export const errorResponse = (error: string): ApiResponse<null> => ({
success: false,
error,
});

// Input sanitization
/**
* Sanitizes a string input
* @param input - String to sanitize
* @returns string - Sanitized string
*/
export const sanitizeInput = (input: string): string => {
return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Pagination helper
/**
* Creates pagination metadata
* @param params - Pagination parameters
* @returns PaginationResult - Pagination metadata
*/
export const paginateResults = <T>(
data: T[],
params: PaginationParams
): PaginationResult<T> => {
const { page, limit, totalItems } = params;
const totalPages = Math.ceil(totalItems / limit);

return {
    data: data,
    pagination: {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    },
};
};

// Query string parser
/**
* Parses query parameters into a typed object
* @param query - Query object from request
* @returns object - Parsed and validated query parameters
*/
export const parseQueryString = <T extends object>(
query: Record<string, string>
): Partial<T> => {
const result: Partial<T> = {};
for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    (result as any)[key] = value;
}
return result;
};

// Error message formatting
/**
* Formats error messages for consistent display
* @param error - Error object or string
* @returns string - Formatted error message
*/
export const formatErrorMessage = (error: Error | string): string => {
if (error instanceof Error) {
    return process.env.NODE_ENV === 'development'
    ? `${error.name}: ${error.message}\n${error.stack}`
    : error.message;
}
return error;
};

/**
* Sends an error response using the Response object
* @param res - Express Response object
* @param error - Error to send
* @param status - HTTP status code
*/
export const sendError = (
res: Response,
error: Error | string,
status: number = 500
): void => {
res.status(status).json(errorResponse(formatErrorMessage(error)));
};

