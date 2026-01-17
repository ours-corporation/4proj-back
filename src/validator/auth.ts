import { Request, Response } from 'express';
import User from '../models/user';
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
        password: z.string({ message: "Le mot de passe est obligatoire" })
    })
})