import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FolderService from '../src/services/folder';
import ShareService from '../src/services/share';
import { Folder, File, Share } from '../src/models';

vi.mock('../src/models', () => ({
    Folder: { findByPk: vi.fn(), findAll: vi.fn() },
    File: { findAll: vi.fn() },
    Share: { findOne: vi.fn() }
}));

describe('FolderService - getFolderContent (Refactor & Breadcrumbs)', () => {

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('devrait retourner le contenu de la racine pour le propriétaire', async () => {
        (Folder.findAll as any).mockResolvedValue([{ id: 1, name: 'Dossier 1' }]);
        (File.findAll as any).mockResolvedValue([{ id: 10, name: 'Fichier 1' }]);

        const result = await FolderService.getFolderContent(null, 42);

        expect(result.current).toBeNull();
        expect(result.breadcrumbs).toEqual([{ id: null, name: 'Accueil' }]);
        expect(result.folders).toHaveLength(1);
        expect(result.files).toHaveLength(1);
        
        expect(Folder.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { parent_id: null, user_id: 42, trashed_at: null }
        }));
    });

    it('devrait retourner le contenu d\'un sous-dossier privé avec le bon fil d\'ariane', async () => {
        const userId = 42;
        const currentFolder = { id: 10, name: 'Sous-Dossier', user_id: userId, parent_id: 5, toJSON: () => ({ id: 10, name: 'Sous-Dossier' }) };
        const parentFolder = { id: 5, name: 'Dossier Parent', user_id: userId, parent_id: null };

        (Folder.findByPk as any).mockImplementation((id: number) => {
            if (id === 10) return Promise.resolve(currentFolder);
            if (id === 5) return Promise.resolve(parentFolder);
            return Promise.resolve(null);
        });

        (Folder.findAll as any).mockResolvedValue([]);
        (File.findAll as any).mockResolvedValue([]);

        const result = await FolderService.getFolderContent(10, userId);

        expect(result.breadcrumbs).toEqual([
            { id: null, name: 'Accueil' },
            { id: 5, name: 'Dossier Parent' },
            { id: 10, name: 'Sous-Dossier' }
        ]);
        expect(result.current.permission).toBe('OWNER');
    });

    it('devrait arrêter le fil d\'ariane à la racine du partage (Sécurité Breadcrumb)', async () => {
        const userId = 42;
        const ownerId = 99;

        const subFolder = { id: 15, name: 'Sous-dossier', user_id: ownerId, parent_id: 10, toJSON: () => ({ id: 15, name: 'Sous-dossier' }) };
        const sharedRootFolder = { id: 10, name: 'Projet Partagé', user_id: ownerId, parent_id: 5 };
        const secretParentFolder = { id: 5, name: 'Dossier Secret', user_id: ownerId, parent_id: null };

        (Folder.findByPk as any).mockImplementation((id: number) => {
            if (id === 15) return Promise.resolve(subFolder);
            if (id === 10) return Promise.resolve(sharedRootFolder);
            if (id === 5) return Promise.resolve(secretParentFolder);
            return Promise.resolve(null);
        });

        vi.spyOn(ShareService, 'hasFolderAccess').mockResolvedValue('READ');

        (Share.findOne as any).mockImplementation((query: any) => {
            if (query.where.folder_id === 10) {
                return Promise.resolve({ id: 999, permission: 'READ' });
            }
            return Promise.resolve(null);
        });

        (Folder.findAll as any).mockResolvedValue([]);
        (File.findAll as any).mockResolvedValue([]);

        const result = await FolderService.getFolderContent(15, userId);

        expect(result.breadcrumbs).toEqual([
            { id: 'shared', name: 'Partagés avec moi' },
            { id: 10, name: 'Projet Partagé' },
            { id: 15, name: 'Sous-dossier' }
        ]);
        
        expect(Folder.findByPk).not.toHaveBeenCalledWith(5);
    });
});