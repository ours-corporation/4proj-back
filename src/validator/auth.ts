import { z } from 'zod';

interface RegisterBody {
    username?: string;
    email?: string;
    password?: string;
}


export const loginValidatorSchema = z.object({
    body: z.object({
        email: z.string({ message: "L'email est obligatoire" })
                 .email("Le format de l'email est invalide"),
        password: z.string({ message: "Le mot de passe est obligatoire" })
    })
});

export const passwordSchema = z
    .string({ message: "Le mot de passe est obligatoire" })
    .min(12, "Le mot de passe doit contenir au moins 12 caractères")
    .refine((v) => /[A-Z]/.test(v), { message: "Le mot de passe doit contenir au moins une majuscule" })
    .refine((v) => /[0-9]/.test(v), { message: "Le mot de passe doit contenir au moins un chiffre" })
    .refine((v) => /[^A-Za-z0-9]/.test(v), { message: "Le mot de passe doit contenir au moins un caractère spécial" });

export const registerValidatorSchema = z.object({
    body: z.object({
        username: z
            .string()
            .optional()
            .refine((val) => !val || val.length >= 3, {
                message: "Le nom d'utilisateur doit contenir au moins 3 caractères",
            })
            .refine((val) => !val || val.length <= 30, {
                message: "Le nom d'utilisateur ne peut pas dépasser 30 caractères",
            })
            .refine(
                (val) => !val || /^[a-zA-Z0-9_-]+$/.test(val),
                { message: "Le nom d'utilisateur ne peut contenir que des lettres, des chiffres, des underscores (_) et des tirets (-)" }
            ),

        email: z.string({ message: "L'email est obligatoire" })
                 .email("Le format de l'email est invalide"),
        password: passwordSchema,
    })
})