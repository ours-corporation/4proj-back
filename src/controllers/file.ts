import { Request, Response } from 'express';
import FileService from '../services/file';

export const uploadFile = async (req: Request, res: Response) => {
    try {
        // Vérification de base
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier envoyé" });
        }

        // On récupère l'ID utilisateur depuis le token JWT (req.user injecté par le middleware d'auth)
        // @ts-ignore (si tu n'as pas encore étendu le type Request)
        const userId = req.user.id; 
        const parentId = req.body.parent_id ? parseInt(req.body.parent_id) : null;

        // Appel du fameux service que nous avons créé
        const newFile = await FileService.uploadFile(userId, req.file, parentId);

        res.status(201).json(newFile);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const downloadFile = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;

        const fileData = await FileService.getFileForDownload(fileId, userId);

        res.download(fileData.path, fileData.name, (err) => {
            if (err) {
                console.error("Erreur lors de l'envoi du fichier :", err);
                if (!res.headersSent) {
                    res.status(500).send("Erreur lors du téléchargement.");
                }
            }
        });

    } catch (error: any) {
        console.error(error);
        if (error.message.includes("introuvable") || error.message.includes("interdit")) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur serveur." });
    }
};

export const getRecentFiles = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const limit = req.query.limit as number; 
        
        // @ts-ignore
        const files = await FileService.getRecentFiles(req.user.id, limit);
        res.json(files);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const updateFile = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { name } = req.body; // On extrait les champs modifiables

        // @ts-ignore
        const updatedFile = await FileService.updateFile(id, req.user.id, { name });
        
        res.json(updatedFile);
    } catch (error: any) {
        console.error(error);
        if (error.message.includes("introuvable")) {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Erreur serveur" });
        }
    }
};