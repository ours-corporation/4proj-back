import { Request, Response } from 'express';
import ShareService from '../services/share';

// POST /shares/public
export const createPublicShare = async (req: Request, res: Response) => {
    try {
        // On détermine si c'est un fichier ou un dossier
        const target = req.body.fileId 
            ? { type: 'file' as const, id: req.body.fileId }
            : { type: 'folder' as const, id: req.body.folderId };

        // @ts-ignore (User injecté par middleware auth)
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

//POST /shares/private
export const createPrivateShare = async (req: Request, res: Response) => {
    try {
        const target = req.body.fileId 
            ? { type: 'file' as const, id: req.body.fileId }
            : { type: 'folder' as const, id: req.body.folderId };

        // @ts-ignore
        const ownerId = req.user.id;

        const share = await ShareService.createPrivateShare(
            ownerId,
            target,
            req.body.email,
            req.body.permission || 'READ'
        );

        res.status(201).json(share);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

//POST /public/access/:token
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

//GET /shares/received
export const getReceivedShares = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const shares = await ShareService.getSharedWithMe(req.user.id);
        res.json(shares);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

//DELETE /shares/:id
export const revokeShare = async (req: Request, res: Response) => {
    try {
        const shareId = parseInt(req.params.id);
        // @ts-ignore
        const ownerId = req.user.id;

        await ShareService.revokeShare(ownerId, shareId);

        res.json({ message: "Partage supprimé avec succès." });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};