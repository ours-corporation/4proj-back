import { z } from 'zod';

// Ce schéma servira pour Download ET Delete (et tout ce qui a besoin d'un ID)
export const fileIdSchema = z.object({
    params: z.object({
        // On vérifie que c'est une chaîne composée uniquement de chiffres
        id: z.string({ message: "L'ID est requis" })
             .regex(/^\d+$/, "L'ID du fichier doit être un nombre valide")
    })
});

export const recentFileSchema = z.object({
    query: z.object({
        // On accepte un nombre, avec une valeur par défaut de 10
        limit: z.coerce.number().min(1).max(50).default(6)
    })
});

export const updateFileSchema = z.object({
    params: z.object({
        id: z.coerce.number()
    }),
    body: z.object({
        name: z.string().min(1, "Le nom ne peut pas être vide").optional(),
        // On pourra ajouter d'autres champs ici plus tard (ex: folder_id pour déplacer)
    })
});

export const uploadFilesSchema = z.object({
    body: z.object({
        folder_id: z.coerce.number().int().positive().optional()
    })
});