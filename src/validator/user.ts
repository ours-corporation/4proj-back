import { z } from 'zod';

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
        NewPassword: z.string({ message: "Le mot de passe est requis" })
                        .min(12, "Le mot de passe doit contenir au moins 12 caractères")
                        .refine((val) => /[A-Z]/.test(val), { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
                        .refine((val) => /[a-z]/.test(val), { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
                        .refine((val) => /[0-9]/.test(val), { message: "Le mot de passe doit contenir au moins un chiffre" })
                        .refine((val) => /[!@#$%^&*]/.test(val), { message: "Le mot de passe doit contenir au moins un caractère spécial (! @ # $ % ^ & *)" }),
    })
});