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
        isImage: vi.fn(),
        getThumbnailPath: vi.fn(),
        generateThumbnails: vi.fn(),
        copyThumbnails: vi.fn(),
        getSmallThumbnailBase64: vi.fn(),
        deleteThumbnails: vi.fn()
    }
}));

vi.mock('fs', () => {
    const mockFs = {
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn(),
        renameSync: vi.fn(),
        unlinkSync: vi.fn(),
        copyFileSync: vi.fn(),
        readFileSync: vi.fn()
    };
    return { default: mockFs, ...mockFs };
});

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'new-uuid')
}));

describe('FileService.getFileForStream', () => {
    const ownerId = 42;
    const guestId = 100;

    const createMockFile = (id: number, overrides = {}) => ({
        id,
        name: 'video',
        extension: 'mp4',
        fullName: 'video.mp4',
        size_bytes: 10485760,
        mime_type: 'video/mp4',
        physical_key: 'video-uuid',
        user_id: ownerId,
        folder_id: 10,
        trashed_at: null,
        ...overrides
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait retourner les infos du fichier pour le streaming (propriétaire)', async () => {
        const file = createMockFile(1);
        (File.findByPk as any).mockResolvedValueOnce(file);

        const result = await FileService.getFileForStream(1, ownerId);

        expect(result.path).toContain('video-uuid');
        expect(result.mimeType).toBe('video/mp4');
        expect(result.sizeBytes).toBe(10485760);
    });

    it('devrait fonctionner avec un accès partagé READ', async () => {
        const file = createMockFile(1);
        (File.findByPk as any).mockResolvedValueOnce(file);
        (ShareService.hasFileAccess as any).mockResolvedValueOnce('READ');

        const result = await FileService.getFileForStream(1, guestId);

        expect(result.mimeType).toBe('video/mp4');
        expect(result.sizeBytes).toBe(10485760);
    });

    it('devrait convertir size_bytes BigInt en Number', async () => {
        const file = createMockFile(1, { size_bytes: BigInt(5242880) });
        (File.findByPk as any).mockResolvedValueOnce(file);

        const result = await FileService.getFileForStream(1, ownerId);

        expect(typeof result.sizeBytes).toBe('number');
        expect(result.sizeBytes).toBe(5242880);
    });

    it('devrait échouer si fichier introuvable', async () => {
        (File.findByPk as any).mockResolvedValueOnce(null);

        await expect(FileService.getFileForStream(999, ownerId))
            .rejects.toThrow('introuvable');
    });

    it('devrait échouer si accès insuffisant', async () => {
        const file = createMockFile(1);
        (File.findByPk as any).mockResolvedValueOnce(file);
        (ShareService.hasFileAccess as any).mockResolvedValueOnce(null);

        await expect(FileService.getFileForStream(1, guestId))
            .rejects.toThrow('interdit');
    });

    it('devrait échouer si le fichier physique est manquant', async () => {
        const fs = await import('fs');
        const file = createMockFile(1);
        (File.findByPk as any).mockResolvedValueOnce(file);
        (fs.existsSync as any).mockReturnValueOnce(false);

        await expect(FileService.getFileForStream(1, ownerId))
            .rejects.toThrow('introuvable');
    });
});
