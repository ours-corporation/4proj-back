import { z } from 'zod';

export const trashIdSchema = z.object({
    params: z.object({
        id: z.string({ message: "L'ID est requis" })
             .regex(/^\d+$/, "L'ID doit être un nombre valide")
    })
});