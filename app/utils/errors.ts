export interface ErrorResponse {
status: number;
code: string;
message: string;
details?: unknown;
}

export interface ValidationErrorDetail {
field: string;
message: string;
}

export const HttpStatusCodes = {
BAD_REQUEST: 400,
UNAUTHORIZED: 401,
FORBIDDEN: 403,
NOT_FOUND: 404,
CONFLICT: 409,
INTERNAL_SERVER: 500,
} as const;

export class AppError extends Error {
readonly status: number;
readonly code: string;
readonly details?: unknown;

constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
}

toJSON(): ErrorResponse {
    return {
    status: this.status,
    code: this.code,
    message: this.message,
    details: this.details,
    };
}
}

export class ValidationError extends AppError {
constructor(message: string, details?: ValidationErrorDetail[]) {
    super(message, HttpStatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', details);
}
}

export class NotFoundError extends AppError {
constructor(message: string) {
    super(message, HttpStatusCodes.NOT_FOUND, 'NOT_FOUND');
}
}

export class UnauthorizedError extends AppError {
constructor(message: string = 'Unauthorized') {
    super(message, HttpStatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
}
}

export class ForbiddenError extends AppError {
constructor(message: string = 'Forbidden') {
    super(message, HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
}
}

export class ConflictError extends AppError {
constructor(message: string) {
    super(message, HttpStatusCodes.CONFLICT, 'CONFLICT');
}
}

export class DatabaseError extends AppError {
constructor(message: string, details?: unknown) {
    super(message, HttpStatusCodes.INTERNAL_SERVER, 'DATABASE_ERROR', details);
}
}

