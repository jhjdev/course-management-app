import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment type
export type Environment = 'development' | 'production' | 'test';

// Database configuration schema
const databaseSchema = z.object({
uri: z.string().url(),
name: z.string().min(1),
options: z.object({
    retryWrites: z.boolean().default(true),
    writeConcern: z.string().default('majority'),
    maxPoolSize: z.number().default(10),
}).default({}),
});

// Server configuration schema
const serverSchema = z.object({
host: z.string().default('localhost'),
port: z.number().int().positive().default(3000),
nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

// Security configuration schema
const securitySchema = z.object({
cors: z.object({
    origin: z.string().or(z.array(z.string())).default('*'),
    credentials: z.boolean().default(true),
}),
rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100), // limit each IP to 100 requests per windowMs
}),
jwtSecret: z.string().min(1),
});

// Logging configuration schema
const loggingSchema = z.object({
level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
format: z.enum(['json', 'pretty']).default('json'),
});

// API configuration schema
const apiSchema = z.object({
version: z.string().default('v1'),
prefix: z.string().default('/api'),
timeout: z.number().default(30000), // 30 seconds
});

// Complete configuration schema
const configSchema = z.object({
environment: serverSchema.shape.nodeEnv,
server: serverSchema,
database: databaseSchema,
security: securitySchema,
logging: loggingSchema,
api: apiSchema,
});

// Configuration type
export type Config = z.infer<typeof configSchema>;

// Environment-specific configurations
const configurations: Record<Environment, Partial<Config>> = {
development: {
    logging: {
    level: 'debug',
    format: 'pretty',
    },
},
production: {
    logging: {
    level: 'warn',
    format: 'json',
    },
},
test: {
    logging: {
    level: 'error',
    format: 'pretty',
    },
},
};

// Load and validate configuration
const loadConfig = (): Config => {
const env = process.env.NODE_ENV as Environment || 'development';

const rawConfig = {
    environment: env,
    server: {
    host: process.env.SERVER_HOST,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    nodeEnv: env,
    },
    database: {
    uri: process.env.MONGODB_URI,
    name: process.env.MONGODB_NAME,
    options: {
        retryWrites: true,
        writeConcern: 'majority',
        maxPoolSize: 10,
    },
    },
    security: {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
    },
    jwtSecret: process.env.JWT_SECRET,
    },
    logging: {
    level: process.env.LOG_LEVEL,
    format: process.env.LOG_FORMAT,
    },
    api: {
    version: process.env.API_VERSION,
    prefix: process.env.API_PREFIX,
    timeout: process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT, 10) : undefined,
    },
    ...configurations[env],
};

try {
    return configSchema.parse(rawConfig);
} catch (error) {
    if (error instanceof z.ZodError) {
    throw new Error(`Configuration validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
}
};

// Export the configuration
export const config = loadConfig();

// Export individual configuration sections for convenience
export const {
server,
database,
security,
logging,
api,
} = config;

