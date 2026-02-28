import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import FileService from '../src/services/file';
import ShareService from '../src/services/share';
import { File, User, Quota } from '../src/models';

vi.mock('../src/models', () => ({
    File: { 
        create: vi.fn(), 
        findByPk: vi.fn(),
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
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        renameSync: vi.fn(),
        unlinkSync: vi.fn(),
        promises: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            copyFile: vi.fn().mockResolvedValue(undefined),
            unlink: vi.fn().mockResolvedValue(undefined)
        }
    };

    return {
        default: mockFs,
        ...mockFs
    };
});

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'fake-uuid-1234-5678')
}));

vi.mock('../src/services/share', () => ({
    default: {
        hasFileAccess: vi.fn()
    }
}));

describe('FileService', () => {

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('uploadMultipleFiles', () => {
        const userId = 42;
        const folderId = 10;
        
        const mockFiles: any[] = [
            { originalname: 'vacances.jpg', size: 1024, mimetype: 'image/jpeg', path: '/tmp/fake-file-1' },
            { originalname: 'facture.pdf', size: 2048, mimetype: 'application/pdf', path: '/tmp/fake-file-2' }
        ];

        beforeEach(() => {
            (User.findByPk as any).mockResolvedValue({
                id: userId,
                quota: { quota_bytes: 30 * 1024 * 1024 * 1024 }
            });
            (File.sum as any).mockResolvedValue(0);
        });

        it('devrait jeter une erreur si aucun fichier n\'est fourni', async () => {
            await expect(FileService.uploadMultipleFiles([], userId, folderId))
                .rejects.toThrow("Aucun fichier à uploader.");
                
            await expect(FileService.uploadMultipleFiles(null as any, userId, folderId))
                .rejects.toThrow("Aucun fichier à uploader.");
        });

        it('devrait créer le dossier utilisateur s\'il n\'existe pas', async () => {
            (File.create as any).mockResolvedValue({ id: 1 });

            await FileService.uploadMultipleFiles([mockFiles[0]], userId, null);

            expect((fs as any).promises.mkdir).toHaveBeenCalledWith(
                path.join('/app/uploads', userId.toString()),
                { recursive: true }
            );
        });

        it('devrait uploader plusieurs fichiers et les enregistrer en base', async () => {
            (File.create as any).mockImplementation((data: any) => Promise.resolve({ id: Math.random(), ...data }));

            const results = await FileService.uploadMultipleFiles(mockFiles, userId, folderId);

            expect(results).toHaveLength(2);

            expect((fs as any).promises.copyFile).toHaveBeenCalledWith(
                '/tmp/fake-file-1',
                path.join('/app/uploads', userId.toString(), 'fake-uuid-1234-5678')
            );

            expect(File.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'vacances',
                extension: 'jpg',
                mime_type: 'image/jpeg',
                physical_key: 'fake-uuid-1234-5678',
                user_id: 42,
                folder_id: 10
            }));

            expect((fs as any).promises.copyFile).toHaveBeenCalledTimes(2);
            expect((fs as any).promises.unlink).toHaveBeenCalledTimes(2);
            expect(File.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('getFileForDownload', () => {
        const fileId = 99;
        const ownerId = 42;
        const guestId = 100;

        const mockFile = {
            id: fileId,
            name: 'secret.txt',
            mime_type: 'text/plain',
            physical_key: 'uuid-secret',
            user_id: ownerId,
            folder_id: 5
        };

        it('devrait jeter une erreur si le fichier n\'existe pas en base', async () => {
            (File.findByPk as any).mockResolvedValue(null);

            await expect(FileService.getFileForDownload(fileId, ownerId))
                .rejects.toThrow("Fichier introuvable.");
        });

        it('devrait bloquer le téléchargement si l\'utilisateur n\'a aucun accès', async () => {
            (File.findByPk as any).mockResolvedValue(mockFile);
            
            (ShareService.hasFileAccess as any).mockResolvedValue(null);

            await expect(FileService.getFileForDownload(fileId, guestId))
                .rejects.toThrow("Accès interdit pour ce fichier.");
        });

        it('devrait jeter une erreur si le fichier physique a disparu du disque', async () => {
            (File.findByPk as any).mockResolvedValue(mockFile);
            
            (fs.existsSync as any).mockReturnValue(false);

            await expect(FileService.getFileForDownload(fileId, ownerId))
                .rejects.toThrow("Erreur : Le fichier physique est introuvable.");
        });

        it('devrait autoriser le téléchargement pour le propriétaire', async () => {
            (File.findByPk as any).mockResolvedValue(mockFile);
            (fs.existsSync as any).mockReturnValue(true);

            const result = await FileService.getFileForDownload(fileId, ownerId);

            expect(result).toEqual({
                path: path.join('/app/uploads', ownerId.toString(), 'uuid-secret'),
                name: 'secret.txt',
                mimeType: 'text/plain'
            });

            expect(ShareService.hasFileAccess).not.toHaveBeenCalled();
        });

        it('devrait autoriser le téléchargement pour un invité avec permission READ', async () => {
            (File.findByPk as any).mockResolvedValue(mockFile);
            (fs.existsSync as any).mockReturnValue(true);
            
            (ShareService.hasFileAccess as any).mockResolvedValue('READ');

            const result = await FileService.getFileForDownload(fileId, guestId);

            expect(result.name).toBe('secret.txt');
            
            expect(ShareService.hasFileAccess).toHaveBeenCalledWith(guestId, mockFile);
        });
    });
});