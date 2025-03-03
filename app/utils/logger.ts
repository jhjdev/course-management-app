import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import { AsyncLocalStorage } from 'async_hooks';

/**
* Log levels configuration
*/
const levels = {
error: 0,
warn: 1,
info: 2,
http: 3,
debug: 4,
};

/**
* Log level colors for console output
*/
const colors = {
error: 'red',
warn: 'yellow',
info: 'green',
http: 'magenta',
debug: 'blue',
};

winston.addColors(colors);

/**
* Determines the log level based on environment
*/
const level = () => {
    const env = config.env || 'development';
    const logLevel = config.logging.level;
    return logLevel || (env === 'development' ? 'debug' : 'warn');
};

/**
* List of sensitive fields to mask in logs
*/
const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];

/**
* Masks sensitive data in objects
*/
const maskSensitiveData = (data: any): any => {
if (!data) return data;
if (typeof data !== 'object') return data;

const masked = { ...data };
for (const key in masked) {
    if (sensitiveFields.includes(key.toLowerCase())) {
    masked[key] = '********';
    } else if (typeof masked[key] === 'object') {
    masked[key] = maskSensitiveData(masked[key]);
    }
}
return masked;
};

/**
* Custom format for log messages
*/
const customFormat = format.combine(
format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
format.printf((info) => {
    const { timestamp, level, message, correlationId, ...metadata } = info;
    const metadataStr = Object.keys(metadata).length
    ? JSON.stringify(maskSensitiveData(metadata))
    : '';
    return `${timestamp} [${level}] ${correlationId ? `[${correlationId}] ` : ''}${message} ${metadataStr}`;
})
);

/**
* File transport with rotation
*/
const fileRotateTransport = new transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: format.combine(
        format.timestamp(),
        format.json()
    )
});

/**
* Logger instance
*/
export const Logger = createLogger({
level: level(),
levels,
format: format.combine(
    format.timestamp(),
    format.json()
),
transports: [
    new transports.Console({
    format: format.combine(
        format.colorize({ all: true }),
        customFormat
    ),
    }),
    fileRotateTransport
],
exitOnError: false,
});

/**
* Request context for storing correlation IDs
*/
const asyncLocalStorage = new (require('async_hooks').AsyncLocalStorage)();

/**
* Middleware to add correlation ID to requests
*/
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
const correlationId = req.headers['x-correlation-id'] || uuidv4();
const store = new Map();
store.set('correlationId', correlationId);
store.set('startTime', performance.now());

asyncLocalStorage.run(store, () => {
    res.setHeader('x-correlation-id', correlationId);
    next();
});
};

/**
* Gets the current correlation ID from context
*/
const getCorrelationId = (): string | undefined => {
const store = asyncLocalStorage.getStore();
return store?.get('correlationId');
};

/**
* Extended logger interface with typed methods
*/
interface LogMetadata {
    [key: string]: any;
    error?: Error;
    stack?: string;
    correlationId?: string;
    requestId?: string;
    userId?: string;
    duration?: number;
}

interface ILogger {
    error(message: string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    info(message: string, meta?: LogMetadata): void;
    http(message: string, meta?: LogMetadata): void;
    debug(message: string, meta?: LogMetadata): void;
    performance(operation: string, durationMs: number, meta?: LogMetadata): void;
}
}

/**
* Application logger with additional features
*/
class ApplicationLogger implements ILogger {
private addContext(meta: object = {}) {
    return {
    correlationId: getCorrelationId(),
    ...meta,
    };
}

error(message: string, meta: LogMetadata = {}) {
    if (meta.error instanceof Error) {
        meta.stack = meta.error.stack;
    }
    Logger.error(message, this.addContext(meta));
}

warn(message: string, meta: object = {}) {
    Logger.warn(message, this.addContext(meta));
}

info(message: string, meta: object = {}) {
    Logger.info(message, this.addContext(meta));
}

http(message: string, meta: object = {}) {
    Logger.http(message, this.addContext(meta));
}

debug(message: string, meta: object = {}) {
    Logger.debug(message, this.addContext(meta));
}

performance(operation: string, durationMs: number) {
    this.info(`Performance: ${operation}`, { durationMs });
}
}

export const logger = new ApplicationLogger();

