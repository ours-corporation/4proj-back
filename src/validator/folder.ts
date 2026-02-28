import { z } from 'zod';

// Schéma pour la CRÉATION d'un dossier (POST /)
export const createFolderSchema = z.object({
    body: z.object({
        name: z.string({ message: "Le nom est obligatoire" })
               .min(1, "Le nom ne peut pas être vide")
               .max(255, "Le nom est trop long")
               // On interdit les caractères dangereux pour les fichiers system
               .regex(/^[^<>:"/\\|?*]+$/, "Le nom contient des caractères interdits"),
        
        parent_id: z.number().int().positive().nullable().optional()
    })
});

export const copyFolderSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, "L'ID du dossier doit être un nombre valide")
    })
});

// Schéma pour la RÉCUPÉRATION d'un dossier (GET /:id)
export const getFolderSchema = z.object({
    params: z.object({
        // On s'attend à recevoir l'ID sous forme de string dans l'URL
        // .regex(/^\d+$/) vérifie que c'est bien des chiffres
        id: z.string().regex(/^\d+$/, "L'ID du dossier doit être un nombre valide")
    })
});

// Schéma pour le RENOMMAGE d'un dossier (PUT /:id)
export const renameFolderSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, "L'ID du dossier doit être un nombre valide")
    }),
    body: z.object({
        name: z.string({ message: "Le nom est obligatoire" })
               .min(1, "Le nom ne peut pas être vide")
               .max(255, "Le nom est trop long")
               .regex(/^[^<>:"/\\|?*]+$/, "Le nom contient des caractères interdits")
    })
});