import { Request, Response } from 'express';
import TrashService from '../services/trash';
import { File, Folder, User } from '../models';
import { emitToUser } from '../services/socket';

const emitStorageUpdate = async (userId: number) => {
    const user = await User.findByPk(userId, { attributes: ['used_bytes'] });
    if (user) emitToUser(userId, 'storage:updated', { used_bytes: Number(user.used_bytes) });
};

// PUT /files/:id/trash
export const moveToTrash = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const type = req.originalUrl.includes('/files') ? 'file' : 'folder';

        await TrashService.moveToTrash(type, id, req.user.id);

        res.json({ message: "Élément déplacé vers la corbeille." });
        if (type === 'file') emitToUser(req.user.id, 'file:trashed', { id });
        else emitToUser(req.user.id, 'folder:trashed', { id });
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
        if (type === 'file') {
            const file = await File.findByPk(id);
            if (file) emitToUser(req.user.id, 'file:restored', file);
        } else {
            const folder = await Folder.findByPk(id);
            if (folder) emitToUser(req.user.id, 'folder:restored', folder);
        }
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
        if (type === 'file') emitToUser(req.user.id, 'file:deleted', { id });
        else emitToUser(req.user.id, 'folder:deleted', { id });
        emitStorageUpdate(req.user.id);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// DELETE /trash
export const emptyTrash = async (req: Request, res: Response) => {
    try {
        await TrashService.emptyTrash(req.user.id);
        res.json({ message: "Corbeille vidée avec succès." });
        emitToUser(req.user.id, 'trash:emptied', {});
        emitStorageUpdate(req.user.id);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
