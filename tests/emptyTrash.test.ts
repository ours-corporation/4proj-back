import { describe, it, expect, vi, afterEach } from 'vitest';
import TrashService from '../src/services/trash';
import { File, Folder, User } from '../src/models';

vi.mock('../src/models', () => ({
    File: {
        findOne: vi.fn(),
        findAll: vi.fn(),
        destroy: vi.fn(),
        update: vi.fn()
    },
    Folder: {
        findByPk: vi.fn(),
        findAll: vi.fn(),
        destroy: vi.fn(),
        update: vi.fn()
    },
    User: {
        findByPk: vi.fn()
    }
}));

vi.mock('fs/promises', () => ({
    default: {
        unlink: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'fake-uuid')
}));

describe('TrashService.emptyTrash', () => {
    const userId = 42;

    const createMockUser = (usedBytes = 5000) => ({
        id: userId,
        used_bytes: usedBytes,
        save: vi.fn().mockResolvedValue(true)
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait vider une corbeille avec des fichiers', async () => {
        const user = createMockUser(2048);
        const trashedFiles = [
            { id: 1, physical_key: 'key-1', size_bytes: 1024, destroy: vi.fn() },
            { id: 2, physical_key: 'key-2', size_bytes: 1024, destroy: vi.fn() }
        ];

        (User.findByPk as any).mockResolvedValue(user);
        (File.findAll as any).mockResolvedValue(trashedFiles);
        // hardDeleteFile calls File.findOne for each file
        (File.findOne as any)
            .mockResolvedValueOnce({ ...trashedFiles[0], destroy: vi.fn().mockResolvedValue(true) })
            .mockResolvedValueOnce({ ...trashedFiles[1], destroy: vi.fn().mockResolvedValue(true) });
        (Folder.findAll as any).mockResolvedValue([]);

        await TrashService.emptyTrash(userId);

        expect(File.findOne).toHaveBeenCalledTimes(2);
        expect(user.save).toHaveBeenCalled();
    });

    it('devrait vider une corbeille avec des dossiers', async () => {
        const user = createMockUser(0);

        (User.findByPk as any).mockResolvedValue(user);
        (File.findAll as any).mockResolvedValue([]);
        (Folder.findAll as any).mockResolvedValueOnce([
            { id: 10 },
            { id: 20 }
        ]);
        // stillExists checks
        (Folder.findByPk as any)
            .mockResolvedValueOnce({ id: 10 })
            .mockResolvedValueOnce({ id: 20 });
        (Folder.destroy as any).mockResolvedValue(1);

        await TrashService.emptyTrash(userId);

        expect(Folder.destroy).toHaveBeenCalledTimes(2);
        expect(user.save).toHaveBeenCalled();
    });

    it('devrait gérer une corbeille vide sans erreur', async () => {
        const user = createMockUser(0);

        (User.findByPk as any).mockResolvedValue(user);
        (File.findAll as any).mockResolvedValue([]);
        (Folder.findAll as any).mockResolvedValue([]);

        await TrashService.emptyTrash(userId);

        expect(user.save).toHaveBeenCalled();
    });

    it('devrait échouer si l\'utilisateur est introuvable', async () => {
        (User.findByPk as any).mockResolvedValue(null);

        await expect(TrashService.emptyTrash(999))
            .rejects.toThrow('User introuvable');
    });

    it('devrait ignorer les dossiers déjà supprimés par cascade', async () => {
        const user = createMockUser(0);

        (User.findByPk as any).mockResolvedValue(user);
        (File.findAll as any).mockResolvedValue([]);
        (Folder.findAll as any).mockResolvedValueOnce([{ id: 10 }]);
        // Folder already deleted by cascade
        (Folder.findByPk as any).mockResolvedValueOnce(null);

        await TrashService.emptyTrash(userId);

        expect(Folder.destroy).not.toHaveBeenCalled();
        expect(user.save).toHaveBeenCalled();
    });
});
