import { describe, it, expect, vi, afterEach } from 'vitest';
import FileService from '../src/services/file';
import ShareService from '../src/services/share';
import { File, User, Quota } from '../src/models';

vi.mock('../src/models', () => ({
    File: {
        findByPk: vi.fn(),
        findAll: vi.fn(),
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

vi.mock('../src/services/thumbnail', () => ({
    default: {
        isImage: vi.fn(() => false),
        getSmallThumbnailBase64: vi.fn(() => null),
        generateThumbnails: vi.fn().mockResolvedValue(undefined),
        copyThumbnails: vi.fn().mockResolvedValue(undefined),
        deleteThumbnails: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('fs', () => {
    const mockFs = {
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn(),
        renameSync: vi.fn(),
        unlinkSync: vi.fn(),
        copyFileSync: vi.fn(),
        promises: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            copyFile: vi.fn().mockResolvedValue(undefined),
            unlink: vi.fn().mockResolvedValue(undefined)
        }
    };
    return { default: mockFs, ...mockFs };
});

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'new-uuid-copy')
}));

describe('FileService.copyFile', () => {
    const ownerId = 42;
    const guestId = 100;

    const createMockFile = (id: number, overrides = {}) => ({
        id,
        name: 'document',
        extension: 'pdf',
        fullName: 'document.pdf',
        size_bytes: 1024,
        mime_type: 'application/pdf',
        physical_key: 'original-uuid',
        user_id: ownerId,
        folder_id: 10,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    const mockUserWithQuota = {
        id: ownerId,
        quota: { quota_bytes: 1000000 }
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait copier un fichier en tant que propriétaire', async () => {
        const file = createMockFile(1);
        const createdFile = { ...file, id: 99, name: 'document (copie)', physical_key: 'new-uuid-copy' };

        (File.findByPk as any).mockResolvedValueOnce(file);
        (User.findByPk as any).mockResolvedValueOnce(mockUserWithQuota);
        (File.sum as any).mockResolvedValueOnce(0);
        (File.findAll as any).mockResolvedValueOnce([]);
        (File.create as any).mockResolvedValueOnce(createdFile);

        const result = await FileService.copyFile(1, ownerId);

        expect(result.name).toBe('document (copie)');
        expect(File.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'document (copie)',
            extension: 'pdf',
            size_bytes: 1024,
            mime_type: 'application/pdf',
            physical_key: 'new-uuid-copy',
            user_id: ownerId,
            folder_id: 10
        }));
    });

    it('devrait copier un fichier avec accès WRITE partagé', async () => {
        const file = createMockFile(1);
        const createdFile = { ...file, id: 99, name: 'document (copie)', user_id: guestId };

        (File.findByPk as any).mockResolvedValueOnce(file);
        (ShareService.hasFileAccess as any).mockResolvedValueOnce('WRITE');
        (User.findByPk as any).mockResolvedValueOnce({ id: guestId, quota: { quota_bytes: 1000000 } });
        (File.sum as any).mockResolvedValueOnce(0);
        (File.findAll as any).mockResolvedValueOnce([]);
        (File.create as any).mockResolvedValueOnce(createdFile);

        const result = await FileService.copyFile(1, guestId);

        expect(result).toBeDefined();
        expect(File.create).toHaveBeenCalledWith(expect.objectContaining({
            user_id: guestId
        }));
    });

    it('devrait échouer si accès READ seul', async () => {
        const file = createMockFile(1);

        (File.findByPk as any).mockResolvedValueOnce(file);
        (ShareService.hasFileAccess as any).mockResolvedValueOnce('READ');

        await expect(FileService.copyFile(1, guestId))
            .rejects.toThrow('interdit');
    });

    it('devrait échouer si fichier introuvable', async () => {
        (File.findByPk as any).mockResolvedValueOnce(null);

        await expect(FileService.copyFile(999, ownerId))
            .rejects.toThrow('introuvable');
    });

    it('devrait échouer si fichier dans la corbeille', async () => {
        const file = createMockFile(1, { trashed_at: new Date() });

        (File.findByPk as any).mockResolvedValueOnce(file);

        await expect(FileService.copyFile(1, ownerId))
            .rejects.toThrow('corbeille');
    });

    it('devrait échouer si quota dépassé', async () => {
        const file = createMockFile(1, { size_bytes: 500000 });

        (File.findByPk as any).mockResolvedValueOnce(file);
        (User.findByPk as any).mockResolvedValueOnce({ id: ownerId, quota: { quota_bytes: 600000 } });
        (File.sum as any).mockResolvedValueOnce(500000);

        await expect(FileService.copyFile(1, ownerId))
            .rejects.toThrow('quota');
    });

    it('devrait générer "nom (copie 2)" si "nom (copie)" existe déjà', async () => {
        const file = createMockFile(1);
        const createdFile = { ...file, id: 99, name: 'document (copie 2)' };

        (File.findByPk as any).mockResolvedValueOnce(file);
        (User.findByPk as any).mockResolvedValueOnce(mockUserWithQuota);
        (File.sum as any).mockResolvedValueOnce(0);
        (File.findAll as any).mockResolvedValueOnce([
            { name: 'document (copie)' }
        ]);
        (File.create as any).mockResolvedValueOnce(createdFile);

        const result = await FileService.copyFile(1, ownerId);

        expect(File.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'document (copie 2)'
        }));
    });
});
