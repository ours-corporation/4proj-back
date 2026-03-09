import { describe, it, expect, vi, afterEach } from 'vitest';
import FolderService from '../src/services/folder';
import ShareService from '../src/services/share';
import { Folder } from '../src/models';

vi.mock('../src/models', () => ({
    Folder: {
        findByPk: vi.fn()
    },
    File: {
        findAll: vi.fn(),
        sum: vi.fn()
    },
    Share: {
        findOne: vi.fn()
    },
    User: {
        findByPk: vi.fn()
    },
    Quota: {}
}));

vi.mock('../src/services/share', () => ({
    default: {
        hasFolderAccess: vi.fn()
    }
}));

vi.mock('../src/services/thumbnail', () => ({
    default: {
        isImage: vi.fn(() => false),
        getSmallThumbnailBase64: vi.fn(() => null)
    }
}));

describe('FolderService.renameFolder', () => {
    const ownerId = 1;
    const guestId = 99;
    const folderId = 10;

    const createMockFolder = (overrides = {}) => ({
        id: folderId,
        name: 'Ancien nom',
        user_id: ownerId,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait renommer le dossier en tant que propriétaire', async () => {
        const mockFolder = createMockFolder();
        (Folder.findByPk as any).mockResolvedValue(mockFolder);

        const result = await FolderService.renameFolder(folderId, ownerId, 'Nouveau nom');

        expect(mockFolder.update).toHaveBeenCalledWith({ name: 'Nouveau nom' });
        expect(result).toBe(mockFolder);
        expect(ShareService.hasFolderAccess).not.toHaveBeenCalled();
    });

    it('devrait jeter une erreur si le dossier est introuvable', async () => {
        (Folder.findByPk as any).mockResolvedValue(null);

        await expect(FolderService.renameFolder(folderId, ownerId, 'Nouveau nom'))
            .rejects.toThrow("Dossier introuvable.");
    });

    it('devrait jeter une erreur si le dossier est dans la corbeille', async () => {
        const mockFolder = createMockFolder({ trashed_at: new Date() });
        (Folder.findByPk as any).mockResolvedValue(mockFolder);

        await expect(FolderService.renameFolder(folderId, ownerId, 'Nouveau nom'))
            .rejects.toThrow("Impossible de renommer un dossier dans la corbeille.");

        expect(mockFolder.update).not.toHaveBeenCalled();
    });

    it('devrait jeter une erreur si l\'utilisateur n\'a aucun accès au dossier', async () => {
        const mockFolder = createMockFolder();
        (Folder.findByPk as any).mockResolvedValue(mockFolder);
        (ShareService.hasFolderAccess as any).mockResolvedValue(null);

        await expect(FolderService.renameFolder(folderId, guestId, 'Nouveau nom'))
            .rejects.toThrow("Accès interdit.");

        expect(mockFolder.update).not.toHaveBeenCalled();
    });

    it('devrait jeter une erreur si l\'utilisateur a seulement un accès READ', async () => {
        const mockFolder = createMockFolder();
        (Folder.findByPk as any).mockResolvedValue(mockFolder);
        (ShareService.hasFolderAccess as any).mockResolvedValue('READ');

        await expect(FolderService.renameFolder(folderId, guestId, 'Nouveau nom'))
            .rejects.toThrow("Seul le propriétaire peut renommer un dossier.");

        expect(mockFolder.update).not.toHaveBeenCalled();
    });

    it('devrait jeter une erreur si l\'utilisateur a seulement un accès WRITE', async () => {
        const mockFolder = createMockFolder();
        (Folder.findByPk as any).mockResolvedValue(mockFolder);
        (ShareService.hasFolderAccess as any).mockResolvedValue('WRITE');

        await expect(FolderService.renameFolder(folderId, guestId, 'Nouveau nom'))
            .rejects.toThrow("Seul le propriétaire peut renommer un dossier.");

        expect(mockFolder.update).not.toHaveBeenCalled();
    });
});
