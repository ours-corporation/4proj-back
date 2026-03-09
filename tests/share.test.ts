import { describe, it, expect, vi, afterEach } from 'vitest';
import ShareService from '../src/services/share';
import { Share, User, File, Folder } from '../src/models';
import bcrypt from 'bcryptjs';

vi.mock('../src/models', () => ({
    Share: {
        findOne: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        findOrCreate: vi.fn()
    },
    User: {
        findOne: vi.fn(),
        findByPk: vi.fn()
    },
    File: {
        findOne: vi.fn()
    },
    Folder: {
        findOne: vi.fn(),
        findByPk: vi.fn()
    }
}));

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'token-uuid-123')
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed-password'),
        compare: vi.fn().mockResolvedValue(true)
    }
}));

describe('ShareService', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('createPublicLink', () => {
        it('devrait créer un lien public pour un fichier', async () => {
            (File.findOne as any).mockResolvedValue({ id: 1 }); // verifyOwnership
            (Share.create as any).mockResolvedValue({ token: 'token-uuid-123', expires_at: null });

            const result = await ShareService.createPublicLink(42, { type: 'file', id: 1 }, {});

            expect(result.token).toBe('token-uuid-123');
            expect(Share.create).toHaveBeenCalledWith(expect.objectContaining({
                owner_id: 42,
                file_id: 1,
                folder_id: null,
                token: 'token-uuid-123',
                permission: 'READ'
            }));
        });

        it('devrait créer un lien public pour un dossier', async () => {
            (Folder.findOne as any).mockResolvedValue({ id: 5 }); // verifyOwnership
            (Share.create as any).mockResolvedValue({ token: 'token-uuid-123', expires_at: null });

            const result = await ShareService.createPublicLink(42, { type: 'folder', id: 5 }, {});

            expect(Share.create).toHaveBeenCalledWith(expect.objectContaining({
                file_id: null,
                folder_id: 5
            }));
        });

        it('devrait rejeter une date d\'expiration dans le passé', async () => {
            (File.findOne as any).mockResolvedValue({ id: 1 });

            await expect(ShareService.createPublicLink(
                42,
                { type: 'file', id: 1 },
                { expiresAt: '2000-01-01T00:00:00Z' }
            )).rejects.toThrow("futur");
        });

        it('devrait rejeter si l\'utilisateur ne possède pas le fichier', async () => {
            (File.findOne as any).mockResolvedValue(null);

            await expect(ShareService.createPublicLink(42, { type: 'file', id: 99 }, {}))
                .rejects.toThrow("droits");
        });

        it('devrait hasher le mot de passe si fourni', async () => {
            (File.findOne as any).mockResolvedValue({ id: 1 });
            (Share.create as any).mockResolvedValue({ token: 'token-uuid-123', expires_at: null });

            await ShareService.createPublicLink(42, { type: 'file', id: 1 }, { password: 'secret' });

            expect((bcrypt as any).hash).toHaveBeenCalledWith('secret', 10);
            expect(Share.create).toHaveBeenCalledWith(expect.objectContaining({
                password_hash: 'hashed-password'
            }));
        });
    });

    describe('createPrivateShare', () => {
        it('devrait créer un partage privé avec un utilisateur existant', async () => {
            (File.findOne as any).mockResolvedValue({ id: 1 }); // verifyOwnership
            (User.findOne as any).mockResolvedValue({ id: 99, email: 'bob@test.com' });
            (Share.findOrCreate as any).mockResolvedValue([{ id: 10, permission: 'READ' }, true]);

            const result = await ShareService.createPrivateShare(
                42, { type: 'file', id: 1 }, 'bob@test.com', 'READ'
            );

            expect(result).toBeDefined();
        });

        it('devrait mettre à jour la permission si le partage existe déjà', async () => {
            const existingShare = { id: 10, permission: 'READ', update: vi.fn().mockResolvedValue(true) };
            (File.findOne as any).mockResolvedValue({ id: 1 });
            (User.findOne as any).mockResolvedValue({ id: 99 });
            (Share.findOrCreate as any).mockResolvedValue([existingShare, false]); // created = false

            await ShareService.createPrivateShare(42, { type: 'file', id: 1 }, 'bob@test.com', 'WRITE');

            expect(existingShare.update).toHaveBeenCalledWith({ permission: 'WRITE' });
        });

        it('devrait rejeter si le destinataire est introuvable', async () => {
            (File.findOne as any).mockResolvedValue({ id: 1 });
            (User.findOne as any).mockResolvedValue(null);

            await expect(ShareService.createPrivateShare(
                42, { type: 'file', id: 1 }, 'nobody@test.com', 'READ'
            )).rejects.toThrow("introuvable");
        });

        it('devrait rejeter si on partage avec soi-même', async () => {
            (File.findOne as any).mockResolvedValue({ id: 1 });
            (User.findOne as any).mockResolvedValue({ id: 42 }); // même id

            await expect(ShareService.createPrivateShare(
                42, { type: 'file', id: 1 }, 'self@test.com', 'READ'
            )).rejects.toThrow("vous-même");
        });
    });

    describe('getPublicContent', () => {
        it('devrait retourner le contenu si le token est valide et sans protection', async () => {
            const mockFile = { id: 1, name: 'rapport.pdf' };
            (Share.findOne as any).mockResolvedValue({
                id: 10,
                file_id: 1,
                folder_id: null,
                password_hash: null,
                expires_at: null,
                file: mockFile,
                folder: null,
                owner: { username: 'Alice' },
                permission: 'READ'
            });

            const result = await ShareService.getPublicContent('valid-token');

            expect(result.protected).toBe(false);
            expect(result.type).toBe('file');
            expect(result.data).toEqual(mockFile);
            expect(result.owner).toBe('Alice');
        });

        it('devrait retourner protected: true si mot de passe requis et non fourni', async () => {
            (Share.findOne as any).mockResolvedValue({
                id: 10,
                password_hash: 'hashed',
                expires_at: null
            });

            const result = await ShareService.getPublicContent('token-protected');

            expect(result.protected).toBe(true);
        });

        it('devrait rejeter si le mot de passe est incorrect', async () => {
            (Share.findOne as any).mockResolvedValue({
                id: 10,
                password_hash: 'hashed',
                expires_at: null
            });
            (bcrypt as any).compare.mockResolvedValue(false);

            await expect(ShareService.getPublicContent('token', 'wrong-password'))
                .rejects.toThrow("incorrect");
        });

        it('devrait rejeter si le lien est expiré', async () => {
            (Share.findOne as any).mockResolvedValue({
                id: 10,
                password_hash: null,
                expires_at: new Date('2000-01-01')
            });

            await expect(ShareService.getPublicContent('expired-token'))
                .rejects.toThrow("expiré");
        });

        it('devrait rejeter si le token est introuvable', async () => {
            (Share.findOne as any).mockResolvedValue(null);

            await expect(ShareService.getPublicContent('invalid-token'))
                .rejects.toThrow("invalide");
        });
    });

    describe('revokeShare', () => {
        it('devrait supprimer le partage si l\'utilisateur est le propriétaire', async () => {
            const mockShare = { destroy: vi.fn().mockResolvedValue(true) };
            (Share.findOne as any).mockResolvedValue(mockShare);

            await ShareService.revokeShare(42, 10);

            expect(mockShare.destroy).toHaveBeenCalled();
        });

        it('devrait rejeter si le partage est introuvable ou pas le propriétaire', async () => {
            (Share.findOne as any).mockResolvedValue(null);

            await expect(ShareService.revokeShare(42, 999))
                .rejects.toThrow("introuvable");
        });
    });

    describe('hasFileAccess', () => {
        it('devrait retourner la permission si un partage direct existe sur le fichier', async () => {
            (Share.findOne as any).mockResolvedValue({ permission: 'WRITE' });

            const result = await ShareService.hasFileAccess(99, { id: 1, folder_id: null });

            expect(result).toBe('WRITE');
        });

        it('devrait vérifier l\'accès via le dossier parent si pas de partage direct', async () => {
            (Share.findOne as any)
                .mockResolvedValueOnce(null)                        // pas de partage direct sur le fichier
                .mockResolvedValueOnce({ permission: 'READ' });    // partage sur le dossier parent

            const result = await ShareService.hasFileAccess(99, { id: 1, folder_id: 10 });

            expect(result).toBe('READ');
        });

        it('devrait retourner null si aucun accès', async () => {
            (Share.findOne as any).mockResolvedValue(null);

            const result = await ShareService.hasFileAccess(99, { id: 1, folder_id: null });

            expect(result).toBeNull();
        });
    });

    describe('hasFolderAccess', () => {
        it('devrait retourner la permission si un partage direct existe sur le dossier', async () => {
            (Share.findOne as any).mockResolvedValue({ permission: 'READ' });

            const result = await ShareService.hasFolderAccess(99, 10);

            expect(result).toBe('READ');
        });

        it('devrait remonter au dossier parent si pas de partage direct', async () => {
            (Share.findOne as any)
                .mockResolvedValueOnce(null)                         // pas de partage sur folder 10
                .mockResolvedValueOnce({ permission: 'WRITE' });    // partage sur folder parent 5
            (Folder.findByPk as any).mockResolvedValue({ parent_id: 5 }); // folder 10 a parent 5

            const result = await ShareService.hasFolderAccess(99, 10);

            expect(result).toBe('WRITE');
        });

        it('devrait retourner null si aucun accès sur toute la hiérarchie', async () => {
            (Share.findOne as any).mockResolvedValue(null);
            (Folder.findByPk as any).mockResolvedValue({ parent_id: null }); // racine

            const result = await ShareService.hasFolderAccess(99, 10);

            expect(result).toBeNull();
        });
    });
});
