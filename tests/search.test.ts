import { describe, it, expect, vi, afterEach } from 'vitest';
import SearchService from '../src/services/search';
import { File, Folder } from '../src/models';

vi.mock('../src/models', () => ({
    File: { findAll: vi.fn() },
    Folder: { findAll: vi.fn() }
}));

describe('SearchService.search', () => {
    const userId = 42;

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait retourner tous les fichiers et dossiers sans filtres', async () => {
        const mockFiles = [{ id: 1, name: 'photo', extension: 'jpg' }];
        const mockFolders = [{ id: 10, name: 'Vacances' }];

        (File.findAll as any).mockResolvedValue(mockFiles);
        (Folder.findAll as any).mockResolvedValue(mockFolders);

        const result = await SearchService.search(userId, {} as any);

        expect(result.files).toEqual(mockFiles);
        expect(result.folders).toEqual(mockFolders);
        expect(File.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ user_id: userId })
        }));
    });

    it('devrait chercher uniquement dans les fichiers avec type: "file"', async () => {
        (File.findAll as any).mockResolvedValue([]);

        const result = await SearchService.search(userId, { type: 'file' } as any);

        expect(File.findAll).toHaveBeenCalled();
        expect(Folder.findAll).not.toHaveBeenCalled();
        expect(result.folders).toHaveLength(0);
    });

    it('devrait chercher uniquement dans les dossiers avec type: "folder"', async () => {
        (Folder.findAll as any).mockResolvedValue([{ id: 5, name: 'Docs' }]);

        const result = await SearchService.search(userId, { type: 'folder' } as any);

        expect(File.findAll).not.toHaveBeenCalled();
        expect(Folder.findAll).toHaveBeenCalled();
        expect(result.files).toHaveLength(0);
    });

    it('devrait exclure les dossiers si category est actif', async () => {
        (File.findAll as any).mockResolvedValue([]);

        await SearchService.search(userId, { category: 'image' } as any);

        expect(File.findAll).toHaveBeenCalled();
        expect(Folder.findAll).not.toHaveBeenCalled();
    });

    it('devrait exclure les dossiers si minSize ou maxSize est actif', async () => {
        (File.findAll as any).mockResolvedValue([]);

        await SearchService.search(userId, { minSize: 100 } as any);

        expect(File.findAll).toHaveBeenCalled();
        expect(Folder.findAll).not.toHaveBeenCalled();
    });

    it('devrait chercher dans la corbeille si trash: true', async () => {
        (File.findAll as any).mockResolvedValue([{ id: 2, trashed_at: new Date() }]);
        (Folder.findAll as any).mockResolvedValue([]);

        const result = await SearchService.search(userId, { trash: true } as any);

        expect(result.files).toHaveLength(1);
        expect(File.findAll).toHaveBeenCalled();
    });

    it('devrait chercher dans les fichiers ET dossiers hors corbeille par défaut', async () => {
        (File.findAll as any).mockResolvedValue([]);
        (Folder.findAll as any).mockResolvedValue([]);

        await SearchService.search(userId, { q: 'rapport' } as any);

        expect(File.findAll).toHaveBeenCalled();
        expect(Folder.findAll).toHaveBeenCalled();
    });
});
