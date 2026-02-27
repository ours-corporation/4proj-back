import { z } from 'zod';

export const searchSchema = z.object({
    query: z.object({
        q: z.string({ message: "Le terme de recherche est requis" })
           .min(1, "La recherche ne peut pas être vide"),
           
        // Scope de recherche
        trash: z.enum(['true', 'false']).transform(v => v === 'true').optional().default(false),

        // Filtres
        type: z.enum(['all', 'file', 'folder']).default('all'),
        category: z.enum(['image', 'video', 'audio', 'document']).optional(), // Nouveau !
        
        // Dates
        after: z.coerce.date().optional(), // Créé après...
        before: z.coerce.date().optional(), // Créé avant...

        // Taille (en octets)
        minSize: z.coerce.number().min(0).optional(),
        maxSize: z.coerce.number().min(0).optional()
    })
});

// Type déduit pour l'utiliser dans le Service
export type SearchFilters = z.infer<typeof searchSchema>['query'];