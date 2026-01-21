import { z } from 'zod';

export const updateUserValidatorSchema = z.object({
    body: z.object({
        lastPassword: z.string().min(1, { message: "L'ancien mot de passe est requis" }),
        NewPassword: z.string().min(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
            .regex(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une lettre minuscule' })
            .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une lettre majuscule' })
            .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
            .regex(/[^a-zA-Z0-9]/, { message: 'Le mot de passe doit contenir au moins un caractère spécial' }),
    })
});