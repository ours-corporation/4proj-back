import { Request, Response } from 'express';
import FolderService from '../services/folder';

export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name, parent_id } = req.body;

        // Validation basique
        if (!name) {
            return res.status(400).json({ message: "Le nom du dossier est obligatoire." });
        }

        // Récupération de l'ID utilisateur (injecté par le middleware requireAuth)
        // @ts-ignore
        const userId = req.user.id;

        // Appel du service
        // On convertit parent_id en Int ou null si non fourni
        const parentIdParsed = parent_id ? parseInt(parent_id) : null;

        const newFolder = await FolderService.createFolder(name, userId, parentIdParsed);

        res.status(201).json(newFolder);

    } catch (error: any) {
        console.error(error);
        
        // Gestion fine des erreurs
        if (error.message.includes("introuvable")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("interdit")) {
            return res.status(403).json({ message: error.message });
        }

        res.status(500).json({ message: "Erreur serveur lors de la création du dossier." });
    }
};