import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: AnyZodObject) => {
return async (req: Request, res: Response, next: NextFunction) => {
    try {
    await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
    });
    next();
    } catch (error) {
    if (error instanceof ZodError) {
        next(new ValidationError('Validation failed', error.errors));
    }
    next(error);
    }
};
};

// Common validation schemas
export const paginationSchema = {
query: {
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().optional().default(10),
},
};

export const idParamSchema = {
params: {
    id: z.string().uuid(),
},
};

