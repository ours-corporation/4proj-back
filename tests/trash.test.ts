import { describe, it, expect, vi, afterEach } from 'vitest';
import TrashService from '../src/services/trash';
import { File, Folder, User } from '../src/models';

vi.mock('../src/models', () => ({
    File: {
        findOne: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn()
    },
    Folder: {
        findByPk: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        destroy: vi.fn()
    },
    User: {
        findByPk: vi.fn()
    }
}));

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'batch-uuid-123')
}));

vi.mock('fs/promises', () => ({
    default: { unlink: vi.fn().mockResolvedValue(undefined) },
    unlink: vi.fn().mockResolvedValue(undefined)
}));

describe('TrashService', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('moveToTrash', () => {
        it('devrait marquer un fichier comme supprimé', async () => {
            (File.update as any).mockResolvedValue([1]);

            await TrashService.moveToTrash('file', 1, 42);

            expect(File.update).toHaveBeenCalledWith(
                expect.objectContaining({ trashed_at: expect.any(Date), deletion_id: 'batch-uuid-123' }),
                { where: { id: 1, user_id: 42, trashed_at: null } }
            );
        });

        it('devrait marquer un dossier et ses fichiers comme supprimés', async () => {
            (Folder.update as any).mockResolvedValue([1]);
            (File.update as any).mockResolvedValue([0]);
            (Folder.findAll as any).mockResolvedValue([]); // pas de sous-dossiers

            await TrashService.moveToTrash('folder', 5, 42);

            expect(Folder.update).toHaveBeenCalledWith(
                expect.objectContaining({ trashed_at: expect.any(Date), deletion_id: 'batch-uuid-123' }),
                { where: { id: 5, user_id: 42, trashed_at: null } }
            );
            expect(File.update).toHaveBeenCalledWith(
                expect.objectContaining({ trashed_at: expect.any(Date), deletion_id: 'batch-uuid-123' }),
                { where: { folder_id: 5, user_id: 42, trashed_at: null } }
            );
        });

        it('devrait récursivement marquer les sous-dossiers', async () => {
            (Folder.update as any).mockResolvedValue([1]);
            (File.update as any).mockResolvedValue([0]);
            (Folder.findAll as any)
                .mockResolvedValueOnce([{ id: 6 }]) // sous-dossier de 5
                .mockResolvedValueOnce([]);           // sous-dossier de 6 (aucun)

            await TrashService.moveToTrash('folder', 5, 42);

            expect(Folder.update).toHaveBeenCalledTimes(2); // dossier 5 + dossier 6
        });
    });

    describe('restoreFromTrash', () => {
        it('devrait restaurer un fichier dans son dossier parent si celui-ci n\'est pas supprimé', async () => {
            const mockFile = { id: 1, folder_id: 10, update: vi.fn().mockResolvedValue(true) };

            (File.findOne as any).mockResolvedValue(mockFile);
            (Folder.findByPk as any).mockResolvedValue({ id: 10, trashed_at: null });

            await TrashService.restoreFromTrash('file', 1, 42);

            expect(mockFile.update).toHaveBeenCalledWith({
                trashed_at: null, deletion_id: null, folder_id: 10
            });
        });

        it('devrait restaurer un fichier à la racine si son parent est encore supprimé', async () => {
            const mockFile = { id: 1, folder_id: 10, update: vi.fn().mockResolvedValue(true) };

            (File.findOne as any).mockResolvedValue(mockFile);
            (Folder.findByPk as any).mockResolvedValue({ id: 10, trashed_at: new Date() });

            await TrashService.restoreFromTrash('file', 1, 42);

            expect(mockFile.update).toHaveBeenCalledWith({
                trashed_at: null, deletion_id: null, folder_id: null
            });
        });

        it('devrait jeter une erreur si le fichier est introuvable', async () => {
            (File.findOne as any).mockResolvedValue(null);

            await expect(TrashService.restoreFromTrash('file', 999, 42))
                .rejects.toThrow('introuvable');
        });

        it('devrait restaurer un dossier et ses fichiers récursivement', async () => {
            (Folder.update as any).mockResolvedValue([1]);
            (File.update as any).mockResolvedValue([1]);
            (Folder.findAll as any).mockResolvedValue([]); // pas de sous-dossiers

            await TrashService.restoreFromTrash('folder', 5, 42);

            expect(Folder.update).toHaveBeenCalledWith(
                { trashed_at: null, deletion_id: null },
                { where: { id: 5, user_id: 42 } }
            );
            expect(File.update).toHaveBeenCalledWith(
                { trashed_at: null, deletion_id: null },
                { where: { folder_id: 5, user_id: 42 } }
            );
        });
    });

    describe('getTrashContent', () => {
        it('devrait retourner les éléments racines supprimés', async () => {
            const folder = { id: 5, parent_id: null, deletion_id: 'b1', trashed_at: new Date() };
            const file = { id: 1, folder_id: null, deletion_id: 'b1', trashed_at: new Date() };

            (Folder.findAll as any).mockResolvedValue([folder]);
            (File.findAll as any).mockResolvedValue([file]);

            const result = await TrashService.getTrashContent(42);

            expect(result.folders).toHaveLength(1);
            expect(result.files).toHaveLength(1);
        });

        it('devrait masquer un sous-dossier supprimé dans le même lot que son parent', async () => {
            const parent = { id: 5, parent_id: null, deletion_id: 'batch-1', trashed_at: new Date() };
            const child = { id: 6, parent_id: 5, deletion_id: 'batch-1', trashed_at: new Date() };

            (Folder.findAll as any).mockResolvedValue([parent, child]);
            (File.findAll as any).mockResolvedValue([]);
            (Folder.findByPk as any).mockResolvedValue(parent);

            const result = await TrashService.getTrashContent(42);

            // child est masqué car même deletion_id que son parent supprimé
            expect(result.folders).toHaveLength(1);
            expect(result.folders[0].id).toBe(5);
        });

        it('devrait afficher un sous-dossier supprimé dans un lot différent de son parent', async () => {
            const parent = { id: 5, parent_id: null, deletion_id: 'batch-1', trashed_at: new Date() };
            const child = { id: 6, parent_id: 5, deletion_id: 'batch-2', trashed_at: new Date() };

            (Folder.findAll as any).mockResolvedValue([parent, child]);
            (File.findAll as any).mockResolvedValue([]);
            (Folder.findByPk as any).mockResolvedValue(parent);

            const result = await TrashService.getTrashContent(42);

            // child a un deletion_id différent → supprimé séparément → visible
            expect(result.folders).toHaveLength(2);
        });
    });

    describe('deletePermanently', () => {
        it('devrait supprimer un fichier, libérer le quota et sauvegarder', async () => {
            const mockUser = { id: 42, used_bytes: 2048, save: vi.fn().mockResolvedValue(true) };
            const mockFile = { id: 1, physical_key: 'uuid-phys', size_bytes: 1024, destroy: vi.fn() };

            (User.findByPk as any).mockResolvedValue(mockUser);
            (File.findOne as any).mockResolvedValue(mockFile);

            await TrashService.deletePermanently('file', 1, 42);

            expect(mockFile.destroy).toHaveBeenCalled();
            expect(mockUser.used_bytes).toBe(1024); // 2048 - 1024
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('devrait jeter une erreur si l\'utilisateur est introuvable', async () => {
            (User.findByPk as any).mockResolvedValue(null);

            await expect(TrashService.deletePermanently('file', 1, 999))
                .rejects.toThrow('User introuvable');
        });

        it('devrait supprimer un dossier vide définitivement', async () => {
            const mockUser = { id: 42, used_bytes: 0, save: vi.fn().mockResolvedValue(true) };

            (User.findByPk as any).mockResolvedValue(mockUser);
            (File.findAll as any).mockResolvedValue([]); // pas de fichiers
            (Folder.findAll as any).mockResolvedValue([]); // pas de sous-dossiers
            (Folder.destroy as any).mockResolvedValue(1);

            await TrashService.deletePermanently('folder', 5, 42);

            expect(Folder.destroy).toHaveBeenCalledWith({ where: { id: 5 } });
            expect(mockUser.save).toHaveBeenCalled();
        });
    });
});
