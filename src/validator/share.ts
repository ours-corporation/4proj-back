import { z } from 'zod';

// Schéma pour créer un Lien Public
export const createPublicShareSchema = z.object({
    body: z.object({
        // L'un des deux doit être fourni (géré par le contrôleur ou une validation custom si besoin)
        fileId: z.number().optional(),
        folderId: z.number().optional(),
        
        // Options de sécurité
        password: z.string().min(4, "Le mot de passe doit faire au moins 4 caractères").optional(),
        expiresAt: z.string().datetime({ message: "Format de date invalide (ISO 8601 requis)" }).optional()
    }).refine(data => data.fileId || data.folderId, {
        message: "Vous devez spécifier un fileId ou un folderId",
        path: ["fileId"]
    })
});

// Schéma pour créer un Partage Privé (Invitation)
export const createPrivateShareSchema = z.object({
    body: z.object({
        fileId: z.number().optional(),
        folderId: z.number().optional(),
        
        email: z.string().email("Email invalide"), // On invite par email
        permission: z.enum(['READ', 'WRITE']).default('READ')
    }).refine(data => data.fileId || data.folderId, {
        message: "Vous devez spécifier un fileId ou un folderId",
        path: ["fileId"]
    })
});

// Schéma pour modifier un partage existant
export const updateShareSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive("L'ID du partage doit être un entier positif.")
    }),
    body: z.object({
        permission: z.enum(['READ', 'WRITE']).optional(),
        password: z.string().min(4, "Le mot de passe doit faire au moins 4 caractères").nullable().optional(),
        expiresAt: z.string().datetime({ message: "Format de date invalide (ISO 8601 requis)" }).nullable().optional()
    })
});

// Schéma pour consulter les partages d'un item
export const itemSharesSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive("L'ID doit être un entier positif.")
    })
});

// Schéma pour accéder à un lien public (Vérification mot de passe)
export const accessPublicShareSchema = z.object({
    params: z.object({
        token: z.string().uuid("Token invalide")
    }),
    body: z.object({
        password: z.string().optional() // Optionnel car le lien n'a peut-être pas de MDP
    })
});