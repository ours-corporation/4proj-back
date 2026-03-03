import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        }) as { body?: any; query?: any; params?: any };

        req.body   = result.body   ?? req.body;
        req.query  = result.query  ?? req.query;
        req.params = result.params ?? req.params;

        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Données invalides",
                errors: error.issues.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        return res.status(500).json({ message: "Erreur interne de validation" });
    }
};