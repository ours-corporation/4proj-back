import { z } from 'zod';

export const fileIdSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive("L'ID du fichier doit être un entier positif.")
    })
});

export const recentFileSchema = z.object({
    query: z.object({
        limit: z.coerce.number().min(1).max(50).default(6)
    })
});

export const updateFileSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive()
    }),
    body: z.object({
        name: z.string()
            .min(1, "Le nom du fichier ne peut pas être vide.")
            .max(255, "Le nom du fichier est trop long.")
            .regex(/^[^\\/:*?"<>|]+$/, 'Le nom contient des caractères non autorisés.')
            .optional()
    })
});

export const uploadFilesSchema = z.object({
    body: z.object({
        folder_id: z.coerce.number().int().positive().optional()
    })
});

export const moveFileSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive("L'ID du fichier doit être un entier positif.")
    }),
    body: z.object({
        folder_id: z.coerce.number().int().positive().nullable()
    })
});