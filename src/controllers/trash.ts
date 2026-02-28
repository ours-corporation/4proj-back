import { Request, Response } from 'express';
import TrashService from '../services/trash';

// PUT /files/:id/trash
export const moveToTrash = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const type = req.originalUrl.includes('/files') ? 'file' : 'folder';

        await TrashService.moveToTrash(type, id, req.user.id);

        res.json({ message: "Élément déplacé vers la corbeille." });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// PUT /files/:id/restore
export const restoreFromTrash = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const type = req.originalUrl.includes('/files') ? 'file' : 'folder';

        await TrashService.restoreFromTrash(type, id, req.user.id);

        res.json({ message: "Élément restauré." });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// GET /trash
export const getTrash = async (req: Request, res: Response) => {
    try {
        const content = await TrashService.getTrashContent(req.user.id);
        res.json(content);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// DELETE /files/:id (Définitive)
export const deletePermanently = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const type = req.originalUrl.includes('/files') ? 'file' : 'folder';

        await TrashService.deletePermanently(type, id, req.user.id);

        res.json({ message: "Élément supprimé définitivement." });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
