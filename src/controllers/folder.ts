import { Request, Response } from 'express';
import FolderService from '../services/folder';

export const createFolder = async (req: Request, res: Response) => {
    try {
        
        const { name, parent_id } = req.body;

        // Récupération de l'ID utilisateur (injecté par le middleware requireAuth)
        // @ts-ignore
        const userId = req.user.id;

        const newFolder = await FolderService.createFolder(name, userId, parent_id);
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

export const getFolder = async (req: Request, res: Response) => {
    try {
        // req.params.id est une string, on la convertit. 
        // Si undefined (route racine), ça devient null.
        const folderId = req.params.id ? parseInt(req.params.id) : null;

        // @ts-ignore
        const userId = req.user.id;

        const content = await FolderService.getFolderContent(folderId, userId);

        res.json(content);

    } catch (error: any) {
        console.error(error);
        if (error.message.includes("introuvable")) return res.status(404).json({ message: error.message });
        if (error.message.includes("interdit")) return res.status(403).json({ message: error.message });
        
        res.status(500).json({ message: "Erreur lors de la récupération du dossier." });
    }
};