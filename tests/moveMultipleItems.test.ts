import { describe, it, expect, vi, afterEach } from 'vitest';
import FileService from '../src/services/file';
import FolderService from '../src/services/folder';
import ShareService from '../src/services/share';
import { File, Folder } from '../src/models';

vi.mock('../src/models', () => ({
    File: {
        findByPk: vi.fn(),
        create: vi.fn(),
        sum: vi.fn()
    },
    Folder: {
        findByPk: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn()
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

describe('FileService.moveMultipleItems', () => {
    const ownerId = 42;
    const guestId = 100;

    const createMockFile = (id: number, overrides = {}) => ({
        id,
        name: `file-${id}.pdf`,
        user_id: ownerId,
        folder_id: 10,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    const createMockFolder = (id: number, overrides = {}) => ({
        id,
        name: `folder-${id}`,
        user_id: ownerId,
        parent_id: 10,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait déplacer 2 fichiers vers un dossier (succès total)', async () => {
        const file1 = createMockFile(1);
        const file2 = createMockFile(2);
        const destFolder = createMockFolder(20);

        (File.findByPk as any)
            .mockResolvedValueOnce(file1)
            .mockResolvedValueOnce(file2);

        (Folder.findByPk as any)
            .mockResolvedValueOnce(destFolder)
            .mockResolvedValueOnce(destFolder);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 1 }, { type: 'file', id: 2 }],
            ownerId,
            20
        );

        expect(result.moved).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
    });

    it('devrait déplacer 1 fichier + 1 dossier vers un dossier (succès total)', async () => {
        const file1 = createMockFile(1);
        const folder5 = createMockFolder(5);
        const destFolder = createMockFolder(20, { parent_id: null });

        (File.findByPk as any).mockResolvedValueOnce(file1);

        (Folder.findByPk as any)
            .mockResolvedValueOnce(destFolder)
            .mockResolvedValueOnce(folder5)
            .mockResolvedValueOnce(destFolder)
            .mockResolvedValueOnce(destFolder);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 1 }, { type: 'folder', id: 5 }],
            ownerId,
            20
        );

        expect(result.moved).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
    });

    it('devrait déplacer vers la racine en tant que propriétaire (succès)', async () => {
        const file1 = createMockFile(1);

        (File.findByPk as any).mockResolvedValueOnce(file1);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 1 }],
            ownerId,
            null
        );

        expect(result.moved).toHaveLength(1);
        expect(result.failed).toHaveLength(0);
        expect(file1.update).toHaveBeenCalledWith({ folder_id: null });
    });

    it('devrait gérer le succès partiel (1 OK, 1 sans accès)', async () => {
        const file1 = createMockFile(1);
        const file2 = createMockFile(2);
        const destFolder = createMockFolder(20);

        (File.findByPk as any)
            .mockResolvedValueOnce(file1)
            .mockResolvedValueOnce(file2);

        (Folder.findByPk as any).mockResolvedValueOnce(destFolder);

        file2.user_id = 999;
        (ShareService.hasFileAccess as any).mockResolvedValueOnce(null);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 1 }, { type: 'file', id: 2 }],
            ownerId,
            20
        );

        expect(result.moved).toHaveLength(1);
        expect(result.moved[0]).toEqual({ type: 'file', id: 1 });
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].id).toBe(2);
        expect(result.failed[0].error).toContain("interdit");
    });

    it('devrait échouer pour un fichier dans la corbeille (dans failed)', async () => {
        const trashedFile = createMockFile(1, { trashed_at: new Date() });
        const normalFile = createMockFile(2);
        const destFolder = createMockFolder(20);

        (File.findByPk as any)
            .mockResolvedValueOnce(trashedFile)
            .mockResolvedValueOnce(normalFile);

        (Folder.findByPk as any).mockResolvedValueOnce(destFolder);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 1 }, { type: 'file', id: 2 }],
            ownerId,
            20
        );

        expect(result.moved).toHaveLength(1);
        expect(result.moved[0]).toEqual({ type: 'file', id: 2 });
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain("corbeille");
    });

    it('devrait échouer si un non-propriétaire tente de déplacer un dossier', async () => {
        const folder5 = createMockFolder(5);
        const destFolder = createMockFolder(20);

        (Folder.findByPk as any)
            .mockResolvedValueOnce(folder5);

        (ShareService.hasFolderAccess as any).mockResolvedValueOnce('WRITE');

        const result = await FileService.moveMultipleItems(
            [{ type: 'folder', id: 5 }],
            guestId,
            20
        );

        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain("propriétaire");
    });

    it('devrait échouer pour une référence circulaire (dossier dans son sous-dossier)', async () => {
        const folder5 = createMockFolder(5, { parent_id: null });

        (Folder.findByPk as any)
            .mockResolvedValueOnce(folder5)
            .mockResolvedValueOnce({ id: 20, parent_id: 5, trashed_at: null });

        const result = await FileService.moveMultipleItems(
            [{ type: 'folder', id: 5 }],
            ownerId,
            20
        );

        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain("circulaire");
    });

    it('devrait échouer si le fichier est introuvable (dans failed)', async () => {
        (File.findByPk as any).mockResolvedValueOnce(null);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 999 }],
            ownerId,
            20
        );

        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain("introuvable");
    });

    it('devrait échouer si le dossier destination est introuvable (dans failed)', async () => {
        const file1 = createMockFile(1);

        (File.findByPk as any).mockResolvedValueOnce(file1);
        (Folder.findByPk as any).mockResolvedValueOnce(null);

        const result = await FileService.moveMultipleItems(
            [{ type: 'file', id: 1 }],
            ownerId,
            999
        );

        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain("introuvable");
    });
});

describe('FolderService.moveFolder', () => {
    const ownerId = 42;

    const createMockFolder = (id: number, overrides = {}) => ({
        id,
        name: `folder-${id}`,
        user_id: ownerId,
        parent_id: null,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait déplacer un dossier vers un autre dossier', async () => {
        const source = createMockFolder(5);
        const dest = createMockFolder(20);

        (Folder.findByPk as any)
            .mockResolvedValueOnce(source)
            .mockResolvedValueOnce(dest)
            .mockResolvedValueOnce(dest);

        const result = await FolderService.moveFolder(5, ownerId, 20);

        expect(source.update).toHaveBeenCalledWith({ parent_id: 20 });
        expect(result).toBe(source);
    });

    it('devrait déplacer un dossier vers la racine', async () => {
        const source = createMockFolder(5, { parent_id: 10 });

        (Folder.findByPk as any).mockResolvedValueOnce(source);

        const result = await FolderService.moveFolder(5, ownerId, null);

        expect(source.update).toHaveBeenCalledWith({ parent_id: null });
        expect(result).toBe(source);
    });

    it('devrait jeter une erreur si le dossier est introuvable', async () => {
        (Folder.findByPk as any).mockResolvedValueOnce(null);

        await expect(FolderService.moveFolder(999, ownerId, 20))
            .rejects.toThrow("Dossier introuvable.");
    });

    it('devrait jeter une erreur si le dossier est dans la corbeille', async () => {
        const source = createMockFolder(5, { trashed_at: new Date() });

        (Folder.findByPk as any).mockResolvedValueOnce(source);

        await expect(FolderService.moveFolder(5, ownerId, 20))
            .rejects.toThrow("corbeille");
    });

    it('devrait empêcher le déplacement dans lui-même', async () => {
        const source = createMockFolder(5);

        (Folder.findByPk as any).mockResolvedValueOnce(source);

        await expect(FolderService.moveFolder(5, ownerId, 5))
            .rejects.toThrow("lui-même");
    });
});
