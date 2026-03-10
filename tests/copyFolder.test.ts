import { describe, it, expect, vi, afterEach } from 'vitest';
import FolderService from '../src/services/folder';
import ShareService from '../src/services/share';
import { File, Folder, User, Quota } from '../src/models';

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
        findByPk: vi.fn(),
        update: vi.fn().mockResolvedValue([1]),
        sequelize: { literal: vi.fn((val: string) => val) }
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

describe('FolderService.copyFolder', () => {
    const ownerId = 42;
    const guestId = 100;

    const createMockFolder = (id: number, overrides = {}) => ({
        id,
        name: `folder-${id}`,
        user_id: ownerId,
        parent_id: null,
        trashed_at: null,
        update: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({ id, name: `folder-${id}` }),
        ...overrides
    });

    const mockUserWithQuota = {
        id: ownerId,
        used_bytes: 0,
        quota: { quota_bytes: 10000000 }
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait copier un dossier vide', async () => {
        const folder = createMockFolder(5);
        const newFolder = createMockFolder(50, { name: 'folder-5 (copie)' });

        (Folder.findByPk as any).mockResolvedValueOnce(folder);
        // calculateFolderSize: no files, no subfolders
        (File.sum as any).mockResolvedValueOnce(0);
        (Folder.findAll as any)
            .mockResolvedValueOnce([])  // calculateFolderSize subfolders
            .mockResolvedValueOnce([])  // getExistingSiblingFolderNames
            ;
        (Folder.create as any).mockResolvedValueOnce(newFolder);
        // copyFolderContents: no files, no subfolders
        (File.findAll as any).mockResolvedValueOnce([]);
        (Folder.findAll as any).mockResolvedValueOnce([]);

        const result = await FolderService.copyFolder(5, ownerId);

        expect(result.name).toBe('folder-5 (copie)');
        expect(Folder.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'folder-5 (copie)',
            user_id: ownerId,
            parent_id: null
        }));
    });

    it('devrait copier un dossier avec des fichiers (récursif)', async () => {
        const folder = createMockFolder(5);
        const newFolder = createMockFolder(50, { name: 'folder-5 (copie)' });
        const mockFile = {
            id: 1, name: 'test', extension: 'txt', fullName: 'test.txt',
            size_bytes: 512, mime_type: 'text/plain', physical_key: 'orig-key',
            user_id: ownerId, folder_id: 5
        };

        (Folder.findByPk as any).mockResolvedValueOnce(folder);
        // calculateFolderSize
        (File.sum as any).mockResolvedValueOnce(512);
        (Folder.findAll as any).mockResolvedValueOnce([]); // no subfolders for size calc
        // quota check
        (User.findByPk as any).mockResolvedValueOnce(mockUserWithQuota);
        // getExistingSiblingFolderNames
        (Folder.findAll as any).mockResolvedValueOnce([]);
        (Folder.create as any).mockResolvedValueOnce(newFolder);
        // copyFolderContents: 1 file, no subfolders
        (File.findAll as any).mockResolvedValueOnce([mockFile]);
        (File.create as any).mockResolvedValueOnce({ ...mockFile, id: 99, physical_key: 'new-uuid-copy' });
        (Folder.findAll as any).mockResolvedValueOnce([]); // no subfolders to copy

        const result = await FolderService.copyFolder(5, ownerId);

        expect(result.name).toBe('folder-5 (copie)');
        expect(File.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'test',
            extension: 'txt',
            folder_id: 50
        }));
    });

    it('devrait copier un dossier avec sous-dossiers (récursif)', async () => {
        const folder = createMockFolder(5);
        const newFolder = createMockFolder(50, { name: 'folder-5 (copie)' });
        const subFolder = createMockFolder(6, { parent_id: 5, name: 'sub' });
        const newSubFolder = createMockFolder(60, { parent_id: 50, name: 'sub' });

        (Folder.findByPk as any).mockResolvedValueOnce(folder);
        // calculateFolderSize for folder 5
        (File.sum as any).mockResolvedValueOnce(0);
        (Folder.findAll as any).mockResolvedValueOnce([subFolder]); // subfolders for size calc
        // calculateFolderSize for subfolder 6
        (File.sum as any).mockResolvedValueOnce(0);
        (Folder.findAll as any).mockResolvedValueOnce([]); // no sub-subfolders
        // getExistingSiblingFolderNames
        (Folder.findAll as any).mockResolvedValueOnce([]);
        // Create root copy
        (Folder.create as any).mockResolvedValueOnce(newFolder);
        // copyFolderContents for folder 5: no files, 1 subfolder
        (File.findAll as any).mockResolvedValueOnce([]);
        (Folder.findAll as any).mockResolvedValueOnce([subFolder]);
        // Create subfolder copy
        (Folder.create as any).mockResolvedValueOnce(newSubFolder);
        // copyFolderContents for subfolder 6: no files, no subfolders
        (File.findAll as any).mockResolvedValueOnce([]);
        (Folder.findAll as any).mockResolvedValueOnce([]);

        const result = await FolderService.copyFolder(5, ownerId);

        expect(result.name).toBe('folder-5 (copie)');
        expect(Folder.create).toHaveBeenCalledTimes(2);
    });

    it('devrait échouer si accès insuffisant', async () => {
        const folder = createMockFolder(5);

        (Folder.findByPk as any).mockResolvedValueOnce(folder);
        (ShareService.hasFolderAccess as any).mockResolvedValueOnce('READ');

        await expect(FolderService.copyFolder(5, guestId))
            .rejects.toThrow('interdit');
    });

    it('devrait échouer si dossier introuvable', async () => {
        (Folder.findByPk as any).mockResolvedValueOnce(null);

        await expect(FolderService.copyFolder(999, ownerId))
            .rejects.toThrow('introuvable');
    });

    it('devrait échouer si dossier dans la corbeille', async () => {
        const folder = createMockFolder(5, { trashed_at: new Date() });

        (Folder.findByPk as any).mockResolvedValueOnce(folder);

        await expect(FolderService.copyFolder(5, ownerId))
            .rejects.toThrow('corbeille');
    });

    it('devrait échouer si quota dépassé', async () => {
        const folder = createMockFolder(5);

        (Folder.findByPk as any).mockResolvedValueOnce(folder);
        // calculateFolderSize returns large size
        (File.sum as any).mockResolvedValueOnce(5000000);
        (Folder.findAll as any).mockResolvedValueOnce([]);
        // quota check: used 4M + incoming 5M > max 6M
        (User.findByPk as any).mockResolvedValueOnce({ id: ownerId, used_bytes: 4000000, quota: { quota_bytes: 6000000 } });

        await expect(FolderService.copyFolder(5, ownerId))
            .rejects.toThrow('quota');
    });
});
