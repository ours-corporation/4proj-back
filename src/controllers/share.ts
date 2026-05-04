import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import ShareService from '../services/share';
import FolderService from '../services/folder';
import { emitToUser } from '../services/socket';

const UPLOAD_ROOT = '/app/uploads';

export const createPublicShare = async (req: Request, res: Response) => {
    try {
        const target = req.body.fileId 
            ? { type: 'file' as const, id: req.body.fileId }
            : { type: 'folder' as const, id: req.body.folderId };

        const ownerId = req.user.id;

        const result = await ShareService.createPublicLink(ownerId, target, {
            password: req.body.password,
            expiresAt: req.body.expiresAt
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

export const createPrivateShare = async (req: Request, res: Response) => {
    try {
        const target = req.body.fileId 
            ? { type: 'file' as const, id: req.body.fileId }
            : { type: 'folder' as const, id: req.body.folderId };

        const ownerId = req.user.id;

        const share = await ShareService.createPrivateShare(
            ownerId,
            target,
            req.body.email,
            req.body.permission || 'READ'
        );

        res.status(201).json(share);
        emitToUser(ownerId, 'share:created', share);
        if (share.recipient_id) emitToUser(share.recipient_id, 'share:received', share);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

export const accessPublicShare = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const result = await ShareService.getPublicContent(token, password);

        if (result.protected) {
            return res.status(403).json({ 
                message: "Mot de passe requis", 
                protected: true 
            });
        }

        res.json(result);
    } catch (error: any) {
        res.status(404).json({ message: error.message });
    }
};

export const getReceivedShares = async (req: Request, res: Response) => {
    try {
        const shares = await ShareService.getSharedWithMe(req.user.id);
        res.json(shares);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const revokeShare = async (req: Request, res: Response) => {
    try {
        const shareId = parseInt(req.params.id);
        const ownerId = req.user.id;

        await ShareService.revokeShare(ownerId, shareId);

        res.json({ message: "Partage supprimé avec succès." });
        emitToUser(ownerId, 'share:revoked', { id: shareId });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

export const getMyShares = async (req: Request, res: Response) => {
    try {
        const shares = await ShareService.getMyShares(req.user.id);
        res.json(shares);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

export const getFileShares = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        const shares = await ShareService.getItemShares(req.user.id, { type: 'file', id: fileId });
        res.json(shares);
    } catch (error: any) {
        const status = error.message.includes('introuvable') || error.message.includes('droits') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

export const getFolderShares = async (req: Request, res: Response) => {
    try {
        const folderId = parseInt(req.params.id);
        const shares = await ShareService.getItemShares(req.user.id, { type: 'folder', id: folderId });
        res.json(shares);
    } catch (error: any) {
        const status = error.message.includes('introuvable') || error.message.includes('droits') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

export const updateShare = async (req: Request, res: Response) => {
    try {
        const shareId = parseInt(req.params.id);
        const ownerId = req.user.id;

        const share = await ShareService.updateShare(ownerId, shareId, {
            permission: req.body.permission,
            password: req.body.password,
            expiresAt: req.body.expiresAt
        });

        res.json(share);
        emitToUser(ownerId, 'share:updated', share);
    } catch (error: any) {
        const status = error.message.includes('introuvable') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

export const downloadPublicFile = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const password = req.body.password || req.query.password;

        const shareInfo = await ShareService.getPublicContent(token, password as string);

        if (shareInfo.protected) {
            return res.status(403).json({ message: "Mot de passe requis pour télécharger." });
        }

        if (shareInfo.type !== 'file') {
            return res.status(400).json({ message: "Ce lien pointe vers un dossier, pas un fichier." });
        }

        const file = shareInfo.data as any;
        const filePath = path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Fichier introuvable sur le serveur." });
        }

        const fileName = file.extension ? `${file.name}.${file.extension}` : file.name;

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("Erreur lors de l'envoi du fichier :", err);
                if (!res.headersSent) {
                    res.status(500).json({ message: "Erreur lors du téléchargement." });
                }
            }
        });

    } catch (error: any) {
        console.error(error);
        if (!res.headersSent) {
            res.status(404).json({ message: error.message });
        }
    }
};

export const downloadPublicFolder = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const password = req.body.password || req.query.password; 

        const shareInfo = await ShareService.getPublicContent(token, password as string);

        if (shareInfo.protected) {
            return res.status(403).json({ message: "Mot de passe requis pour télécharger." });
        }

        if (shareInfo.type !== 'folder') {
            return res.status(400).json({ message: "Ce lien pointe vers un fichier, pas un dossier." });
        }

        const folder = shareInfo.data as any;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folder.name)}.zip"`);

        await FolderService.createZipStream(folder.id, folder.name, res);

    } catch (error: any) {
        console.error(error);
        if (!res.headersSent) {
            res.status(404).json({ message: error.message });
        } else {
            res.end();
        }
    }
};
