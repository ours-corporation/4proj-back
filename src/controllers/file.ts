import { Request, Response } from 'express';
import FileService from '../services/file';

export const uploadFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier envoyé" });
        }

        // @ts-ignore
        const userId = req.user.id;
        const folderId = req.body.folder_id ?? null;

        const newFile = await FileService.uploadSingleFile(req.file, userId, folderId);

        res.status(201).json(newFile);
    } catch (error: any) {
        console.error(error);
        if (error.message.includes("quota")) {
            return res.status(413).json({ message: error.message });
        }
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
        if (error.message.includes("interdit")) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("introuvable")) {
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
        if (error.message.includes("interdit")) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("introuvable")) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const moveFile = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        const { folder_id } = req.body;

        // @ts-ignore
        const userId = req.user.id;

        const movedFile = await FileService.moveFile(fileId, userId, folder_id);

        res.json(movedFile);
    } catch (error: any) {
        console.error(error);
        if (error.message.includes("corbeille")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("interdit") || error.message.includes("propriétaire")) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("introuvable")) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const uploadFiles = async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];
        
        const folderId = req.body.folder_id ? parseInt(req.body.folder_id) : null;
        
        // @ts-ignore
        const userId = req.user.id; 

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "Aucun fichier fourni." });
        }

        const uploadedFiles = await FileService.uploadMultipleFiles(files, userId, folderId);

        res.status(201).json({
            message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès.`,
            files: uploadedFiles
        });

    } catch (error: any) {
        console.error("Erreur d'upload :", error);
        if (error.message.includes("quota")) {
            return res.status(413).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || "Erreur lors de l'upload." });
    }
};

export const moveMultipleItems = async (req: Request, res: Response) => {
    try {
        const { items, destination_folder_id } = req.body;

        // @ts-ignore
        const userId = req.user.id;

        const result = await FileService.moveMultipleItems(items, userId, destination_folder_id);

        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};