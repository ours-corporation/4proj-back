import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FolderService from '../src/services/folder';
import { Folder } from '../src/models'; 
import ShareService from '../src/services/share';

vi.mock('../src/models', () => {
    return {
        Folder: {
            create: vi.fn(),
            findByPk: vi.fn(),
            findAll: vi.fn(),
        },
        File: {
            findAll: vi.fn(),
        },
        Share: {
            findOne: vi.fn()
        }
    };
});

vi.mock('../src/services/thumbnail', () => ({
    default: {
        isImage: vi.fn(() => false),
        getSmallThumbnailBase64: vi.fn(() => null),
        generateThumbnails: vi.fn().mockResolvedValue(undefined),
        copyThumbnails: vi.fn().mockResolvedValue(undefined),
        deleteThumbnails: vi.fn().mockResolvedValue(undefined)
    }
}));



describe('FolderService - Create Folder', () => {

    afterEach(() => {
        vi.restoreAllMocks(); 
        vi.clearAllMocks();
    });

    it('devrait créer un dossier à la racine (parentId null)', async () => {
        const mockFolder = { id: 1, name: 'Mon Dossier', user_id: 1, parent_id: null };
        (Folder.create as any).mockResolvedValue(mockFolder);

        const result = await FolderService.createFolder('Mon Dossier', 1, null);

        expect(Folder.create).toHaveBeenCalledWith({
            name: 'Mon Dossier',
            user_id: 1,
            parent_id: null
        });
        expect(result).toEqual(mockFolder);
    });

    it('devrait créer un dossier dans un parent existant appartenant au user', async () => {
        (Folder.findByPk as any).mockResolvedValue({ id: 10, user_id: 1 });
        
        const mockNewFolder = { id: 2, name: 'Sous-Dossier', user_id: 1, parent_id: 10 };
        (Folder.create as any).mockResolvedValue(mockNewFolder);

        const result = await FolderService.createFolder('Sous-Dossier', 1, 10);

        expect(Folder.findByPk).toHaveBeenCalledWith(10);
        expect(result).toEqual(mockNewFolder);
    });

    it('devrait lancer une erreur si le dossier parent est introuvable', async () => {
        (Folder.findByPk as any).mockResolvedValue(null);

        await expect(FolderService.createFolder('Test', 1, 9999))
            .rejects
            .toThrow("Dossier parent introuvable.");
    });

    it('devrait autoriser la création si j\'ai la permission WRITE sur un dossier partagé', async () => {
        (Folder.findByPk as any).mockResolvedValue({ id: 50, user_id: 99 });

        const spy = vi.spyOn(ShareService, 'hasFolderAccess').mockResolvedValue('WRITE');

        (Folder.create as any).mockResolvedValue({ id: 3, name: 'Dossier Partagé', user_id: 1 });

        await FolderService.createFolder('Dossier Partagé', 1, 50);

        expect(spy).toHaveBeenCalledWith(1, 50);
        expect(Folder.create).toHaveBeenCalled();
    });

    it('devrait bloquer la création si je n\'ai que la permission READ', async () => {
        (Folder.findByPk as any).mockResolvedValue({ id: 50, user_id: 99 });

        vi.spyOn(ShareService, 'hasFolderAccess').mockResolvedValue('READ');

        await expect(FolderService.createFolder('Hacker', 1, 50))
            .rejects
            .toThrow("Accès interdit");
            
        expect(Folder.create).not.toHaveBeenCalled();
    });
});