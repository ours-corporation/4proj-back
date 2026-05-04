import { Request, Response } from 'express';
import fs from 'fs';
import FileService from '../services/file';
import { User } from '../models';
import { emitToUser } from '../services/socket';

const emitStorageUpdate = async (userId: number) => {
    const user = await User.findByPk(userId, { attributes: ['used_bytes'] });
    if (user) emitToUser(userId, 'storage:updated', { used_bytes: Number(user.used_bytes) });
};

export const uploadFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier envoyé" });
        }

        const userId = req.user.id;
        const folderId = req.body.folder_id ?? null;

        const newFile = await FileService.uploadSingleFile(req.file, userId, folderId);

        res.status(201).json(newFile);
        emitToUser(userId, 'file:created', newFile);
        emitStorageUpdate(userId);
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
        const limit = req.query.limit as unknown as number;
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
        const { name } = req.body;

        const updatedFile = await FileService.updateFile(id, req.user.id, { name });

        res.json(updatedFile);
        emitToUser(req.user.id, 'file:updated', updatedFile);
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
        const userId = req.user.id;

        const movedFile = await FileService.moveFile(fileId, userId, folder_id);

        res.json(movedFile);
        emitToUser(userId, 'file:updated', movedFile);
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
        const userId = req.user.id;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "Aucun fichier fourni." });
        }

        const uploadedFiles = await FileService.uploadMultipleFiles(files, userId, folderId);

        res.status(201).json({
            message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès.`,
            files: uploadedFiles
        });
        uploadedFiles.forEach(f => emitToUser(userId, 'file:created', f));
        emitStorageUpdate(userId);

    } catch (error: any) {
        console.error("Erreur d'upload :", error);
        if (error.message.includes("quota")) {
            return res.status(413).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || "Erreur lors de l'upload." });
    }
};

export const copyFile = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        const userId = req.user.id;

        const copiedFile = await FileService.copyFile(fileId, userId);

        res.status(201).json(copiedFile);
        emitToUser(userId, 'file:created', copiedFile);
        emitStorageUpdate(userId);
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

export const getThumbnail = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        const size = (req.query.size as 'small' | 'medium') || 'medium';
        const userId = req.user.id;

        const thumbData = await FileService.getThumbnail(fileId, userId, size);

        res.set('Content-Type', thumbData.mimeType);
        res.sendFile(thumbData.path);
    } catch (error: any) {
        console.error(error);
        if (error.message.includes("pas une image")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("interdit")) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("introuvable")) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const streamFile = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        const userId = req.user.id;

        const fileData = await FileService.getFileForStream(fileId, userId);
        const range = req.headers.range;

        if (!range) {
            res.writeHead(200, {
                'Content-Length': fileData.sizeBytes,
                'Content-Type': fileData.mimeType,
                'Accept-Ranges': 'bytes'
            });
            fs.createReadStream(fileData.path).pipe(res);
            return;
        }

        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileData.sizeBytes - 1;

        if (start >= fileData.sizeBytes || end >= fileData.sizeBytes || start > end) {
            res.writeHead(416, {
                'Content-Range': `bytes */${fileData.sizeBytes}`
            });
            res.end();
            return;
        }

        const chunkSize = end - start + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileData.sizeBytes}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': fileData.mimeType
        });

        fs.createReadStream(fileData.path, { start, end }).pipe(res);
    } catch (error: any) {
        console.error(error);
        if (!res.headersSent) {
            if (error.message.includes("interdit")) {
                return res.status(403).json({ message: error.message });
            }
            if (error.message.includes("introuvable")) {
                return res.status(404).json({ message: error.message });
            }
            res.status(500).json({ message: "Erreur serveur" });
        }
    }
};

export const moveMultipleItems = async (req: Request, res: Response) => {
    try {
        const { items, destination_folder_id } = req.body;
        const userId = req.user.id;

        const result = await FileService.moveMultipleItems(items, userId, destination_folder_id);

        res.json(result);
        emitToUser(userId, 'items:moved', { items, destination_folder_id });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
