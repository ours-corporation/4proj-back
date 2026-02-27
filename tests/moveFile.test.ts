import { describe, it, expect, vi, afterEach } from 'vitest';
import FileService from '../src/services/file';
import ShareService from '../src/services/share';
import { File, Folder } from '../src/models';

vi.mock('../src/models', () => ({
    File: {
        findByPk: vi.fn()
    },
    Folder: {
        findByPk: vi.fn()
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
        hasFileAccess: vi.fn(),
        hasFolderAccess: vi.fn()
    }
}));

vi.mock('fs', () => {
    const mockFs = {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        renameSync: vi.fn(),
        unlinkSync: vi.fn()
    };
    return { default: mockFs, ...mockFs };
});

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'fake-uuid')
}));

describe('FileService.moveFile', () => {
    const ownerId = 42;
    const guestId = 100;
    const fileId = 1;
    const destinationFolderId = 20;

    const createMockFile = (overrides = {}) => ({
        id: fileId,
        name: 'document.pdf',
        user_id: ownerId,
        folder_id: 10,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    const createMockFolder = (overrides = {}) => ({
        id: destinationFolderId,
        name: 'Destination',
        user_id: ownerId,
        trashed_at: null,
        ...overrides
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait déplacer un fichier vers un dossier possédé par le propriétaire', async () => {
        const mockFile = createMockFile();
        const mockFolder = createMockFolder();

        (File.findByPk as any).mockResolvedValue(mockFile);
        (Folder.findByPk as any).mockResolvedValue(mockFolder);

        const result = await FileService.moveFile(fileId, ownerId, destinationFolderId);

        expect(mockFile.update).toHaveBeenCalledWith({ folder_id: destinationFolderId });
        expect(result).toBe(mockFile);
        expect(ShareService.hasFileAccess).not.toHaveBeenCalled();
    });

    it('devrait déplacer un fichier vers la racine en tant que propriétaire', async () => {
        const mockFile = createMockFile();

        (File.findByPk as any).mockResolvedValue(mockFile);

        const result = await FileService.moveFile(fileId, ownerId, null);

        expect(mockFile.update).toHaveBeenCalledWith({ folder_id: null });
        expect(result).toBe(mockFile);
        expect(Folder.findByPk).not.toHaveBeenCalled();
    });

    it('devrait jeter une erreur si le fichier est introuvable', async () => {
        (File.findByPk as any).mockResolvedValue(null);

        await expect(FileService.moveFile(fileId, ownerId, destinationFolderId))
            .rejects.toThrow("Fichier introuvable.");
    });

    it('devrait jeter une erreur si le fichier est dans la corbeille', async () => {
        const mockFile = createMockFile({ trashed_at: new Date() });

        (File.findByPk as any).mockResolvedValue(mockFile);

        await expect(FileService.moveFile(fileId, ownerId, destinationFolderId))
            .rejects.toThrow("Impossible de déplacer un fichier dans la corbeille.");
    });

    it('devrait jeter une erreur si l\'utilisateur n\'a aucun accès au fichier', async () => {
        const mockFile = createMockFile();

        (File.findByPk as any).mockResolvedValue(mockFile);
        (ShareService.hasFileAccess as any).mockResolvedValue(null);

        await expect(FileService.moveFile(fileId, guestId, destinationFolderId))
            .rejects.toThrow("Accès interdit pour ce fichier.");
    });

    it('devrait jeter une erreur si le dossier de destination est introuvable', async () => {
        const mockFile = createMockFile();

        (File.findByPk as any).mockResolvedValue(mockFile);
        (Folder.findByPk as any).mockResolvedValue(null);

        await expect(FileService.moveFile(fileId, ownerId, destinationFolderId))
            .rejects.toThrow("Dossier de destination introuvable.");
    });

    it('devrait jeter une erreur si le dossier de destination est dans la corbeille', async () => {
        const mockFile = createMockFile();
        const mockFolder = createMockFolder({ trashed_at: new Date() });

        (File.findByPk as any).mockResolvedValue(mockFile);
        (Folder.findByPk as any).mockResolvedValue(mockFolder);

        await expect(FileService.moveFile(fileId, ownerId, destinationFolderId))
            .rejects.toThrow("Dossier de destination introuvable.");
    });

    it('devrait jeter une erreur si l\'utilisateur n\'a pas accès WRITE au dossier destination', async () => {
        const mockFile = createMockFile();
        const mockFolder = createMockFolder({ user_id: 999 });

        (File.findByPk as any).mockResolvedValue(mockFile);
        (Folder.findByPk as any).mockResolvedValue(mockFolder);
        (ShareService.hasFileAccess as any).mockResolvedValue('WRITE');
        (ShareService.hasFolderAccess as any).mockResolvedValue('READ');

        await expect(FileService.moveFile(fileId, guestId, destinationFolderId))
            .rejects.toThrow("Accès interdit pour le dossier de destination.");
    });

    it('devrait jeter une erreur si un non-propriétaire tente de déplacer vers la racine', async () => {
        const mockFile = createMockFile();

        (File.findByPk as any).mockResolvedValue(mockFile);
        (ShareService.hasFileAccess as any).mockResolvedValue('WRITE');

        await expect(FileService.moveFile(fileId, guestId, null))
            .rejects.toThrow("Seul le propriétaire peut déplacer un fichier vers la racine.");
    });

    it('devrait autoriser un invité WRITE à déplacer vers un dossier partagé WRITE', async () => {
        const mockFile = createMockFile();
        const mockFolder = createMockFolder({ user_id: 999 });

        (File.findByPk as any).mockResolvedValue(mockFile);
        (Folder.findByPk as any).mockResolvedValue(mockFolder);
        (ShareService.hasFileAccess as any).mockResolvedValue('WRITE');
        (ShareService.hasFolderAccess as any).mockResolvedValue('WRITE');

        const result = await FileService.moveFile(fileId, guestId, destinationFolderId);

        expect(mockFile.update).toHaveBeenCalledWith({ folder_id: destinationFolderId });
        expect(result).toBe(mockFile);
    });
});
