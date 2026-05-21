import { z } from 'zod';
import { passwordSchema } from './auth';

export const updateUserValidatorSchema = z.object({
    body: z.object({
        username: z.string({ message: "Username is required" })
                 .min(3, "Username must be at least 3 characters")
                 .max(30, "Username cannot exceed 30 characters")
                 .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores (_) and hyphens (-)")
                 .optional(),
        email: z.string({ message: "Email is required" })
                 .email("Invalid email format")
                 .optional(),
        password: z.string().optional(),
    })
});

export const updatePasswordValidatorSchema = z.object({
    body: z.object({
        lastPassword: z.string({ message: "L'ancien mot de passe est requis" }),
        NewPassword: passwordSchema,
    })
});