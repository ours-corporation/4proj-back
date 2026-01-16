import { z } from 'zod';

// Ce schéma servira pour Download ET Delete (et tout ce qui a besoin d'un ID)
export const fileIdSchema = z.object({
    params: z.object({
        // On vérifie que c'est une chaîne composée uniquement de chiffres
        id: z.string({ message: "L'ID est requis" })
             .regex(/^\d+$/, "L'ID du fichier doit être un nombre valide")
    })
});