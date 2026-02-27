import { Request, Response } from 'express';
import FolderService from '../services/folder';
import { Folder } from '../models';

export const createFolder = async (req: Request, res: Response) => {
    try {
        
        const { name, parent_id } = req.body;
        // @ts-ignore
        const userId = req.user.id;

        const newFolder = await FolderService.createFolder(name, userId, parent_id);
        res.status(201).json(newFolder);

    } catch (error: any) {
        console.error(error);
        
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

export const copyFolder = async (req: Request, res: Response) => {
    try {
        const folderId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;

        const copiedFolder = await FolderService.copyFolder(folderId, userId);

        res.status(201).json(copiedFolder);
    } catch (error: any) {
        console.error(error);
        if (error.message.includes("corbeille")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("interdit")) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("introuvable")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("quota")) {
            return res.status(413).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const downloadFolder = async (req: Request, res: Response) => {
    try {
        const folderId = parseInt(req.params.id);
        // @ts-ignore
        const userId = req.user.id;

        const folder = await Folder.findByPk(folderId);
        if (!folder) return res.status(404).json({ message: "Dossier introuvable" });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folder.name)}.zip"`);

        await FolderService.streamFolderZip(folderId, userId, res);

    } catch (error: any) {
        console.error(error);
        
        if (!res.headersSent) {
            if (error.message.includes("interdit")) {
                res.status(403).json({ message: error.message });
            } else if (error.message.includes("vide")) {
                res.status(400).json({ message: "Impossible de télécharger un dossier vide." });
            } else {
                res.status(500).json({ message: "Erreur lors de la création du ZIP." });
            }
        } else {
            res.end();
        }
    }
};