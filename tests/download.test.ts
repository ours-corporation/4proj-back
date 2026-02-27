import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import archiver from 'archiver';
import FolderService from '../src/services/folder';
import ShareService from '../src/services/share';
import { downloadPublicFolder } from '../src/controllers/share';
import { Folder, File } from '../src/models';

vi.mock('../src/models', () => ({
    Folder: { findByPk: vi.fn(), findAll: vi.fn() },
    File: { findAll: vi.fn() }
}));

vi.mock('fs', () => ({
    existsSync: vi.fn(() => true)
}));

const mockArchive = {
    pipe: vi.fn(),
    on: vi.fn(),
    file: vi.fn(),
    finalize: vi.fn().mockResolvedValue(true)
};
vi.mock('archiver', () => ({
    default: vi.fn(() => mockArchive)
}));

describe('Système de Téléchargement ZIP (Privé & Public)', () => {

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    describe('FolderService.streamFolderZip (Logique Privée / Partagée)', () => {

        const mockStream = {} as NodeJS.WritableStream;

        it('devrait bloquer si le dossier est introuvable', async () => {
            (Folder.findByPk as any).mockResolvedValue(null);

            await expect(FolderService.streamFolderZip(1, 42, mockStream))
                .rejects.toThrow("Dossier introuvable.");
        });

        it('devrait bloquer si l\'utilisateur n\'est ni proprio ni invité', async () => {
            (Folder.findByPk as any).mockResolvedValue({ id: 1, name: 'Secret', user_id: 99 });
            
            vi.spyOn(ShareService, 'hasFolderAccess').mockResolvedValue(null);

            await expect(FolderService.streamFolderZip(1, 42, mockStream))
                .rejects.toThrow("Accès interdit.");
        });

        it('devrait bloquer si le dossier est totalement vide', async () => {
            (Folder.findByPk as any).mockResolvedValue({ id: 1, name: 'Vide', user_id: 42 });
            
            (File.findAll as any).mockResolvedValue([]);
            (Folder.findAll as any).mockResolvedValue([]);

            await expect(FolderService.streamFolderZip(1, 42, mockStream))
                .rejects.toThrow("Le dossier est vide.");
        });

        it('devrait générer le ZIP pour le propriétaire du dossier', async () => {
            (Folder.findByPk as any).mockResolvedValue({ id: 10, name: 'Mes Vacances', user_id: 42 });
            
            (File.findAll as any).mockResolvedValue([{ 
                user_id: 42, physical_key: 'uuid-123', fullName: 'plage.jpg' 
            }]);
            (Folder.findAll as any).mockResolvedValue([]);

            await FolderService.streamFolderZip(10, 42, mockStream);

            expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 5 } });
            expect(mockArchive.pipe).toHaveBeenCalledWith(mockStream);
            expect(mockArchive.file).toHaveBeenCalled(); // Le fichier a bien été ajouté au ZIP
            expect(mockArchive.finalize).toHaveBeenCalled();
        });

        it('devrait générer le ZIP pour un utilisateur invité (Permission READ)', async () => {
            (Folder.findByPk as any).mockResolvedValue({ id: 10, name: 'Projet', user_id: 99 });
            
            vi.spyOn(ShareService, 'hasFolderAccess').mockResolvedValue('READ');

            (File.findAll as any).mockResolvedValue([{ user_id: 99, physical_key: 'x', fullName: 'doc.pdf' }]);
            (Folder.findAll as any).mockResolvedValue([]);

            await FolderService.streamFolderZip(10, 42, mockStream);

            expect(mockArchive.finalize).toHaveBeenCalled();
        });
    });

    describe('ShareController.downloadPublicFolder (Logique Publique via Token)', () => {

        const mockRequest = (token: string, password?: string) => ({
            params: { token },
            body: { password },
            query: {}
        } as any);

        const mockResponse = () => {
            const res: any = {};
            res.status = vi.fn().mockReturnValue(res);
            res.json = vi.fn().mockReturnValue(res);
            res.setHeader = vi.fn();
            res.end = vi.fn();
            res.headersSent = false;
            return res;
        };

        it('devrait renvoyer 403 si le lien public exige un mot de passe (non fourni)', async () => {
            const req = mockRequest('token-secret');
            const res = mockResponse();

            vi.spyOn(ShareService, 'getPublicContent').mockResolvedValue({ protected: true } as any);

            await downloadPublicFolder(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Mot de passe requis pour télécharger." });
        });

        it('devrait renvoyer 400 si le token public pointe vers un fichier (et non un dossier)', async () => {
            const req = mockRequest('token-file');
            const res = mockResponse();

            vi.spyOn(ShareService, 'getPublicContent').mockResolvedValue({ 
                protected: false, 
                type: 'file',
                data: { id: 5 } 
            } as any);

            await downloadPublicFolder(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Ce lien pointe vers un fichier, pas un dossier." });
        });

        it('devrait initialiser le téléchargement ZIP si le token et dossier sont valides', async () => {
            const req = mockRequest('token-valide');
            const res = mockResponse();

            vi.spyOn(ShareService, 'getPublicContent').mockResolvedValue({ 
                protected: false, 
                type: 'folder', 
                data: { id: 10, name: 'Dossier Public' } 
            } as any);

            const spyCreateZip = vi.spyOn(FolderService, 'createZipStream').mockResolvedValue();

            await downloadPublicFolder(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="Dossier%20Public.zip"');
            
            expect(spyCreateZip).toHaveBeenCalledWith(10, 'Dossier Public', res);
        });
    });
});