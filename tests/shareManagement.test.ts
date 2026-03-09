import { describe, it, expect, vi, afterEach } from 'vitest';
import ShareService from '../src/services/share';
import { Share, User, File, Folder } from '../src/models';

vi.mock('../src/models', () => ({
    File: { findOne: vi.fn(), findAll: vi.fn() },
    Folder: { findOne: vi.fn(), findByPk: vi.fn() },
    User: { findOne: vi.fn() },
    Share: {
        findAll: vi.fn(),
        findOne: vi.fn(),
        findOrCreate: vi.fn(),
        create: vi.fn()
    }
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn((val: string) => Promise.resolve(`hashed_${val}`)),
        compare: vi.fn()
    }
}));

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'test-uuid')
}));

describe('ShareService.getMyShares', () => {
    const ownerId = 42;

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait retourner les partages envoyés formatés', async () => {
        (Share.findAll as any).mockResolvedValueOnce([
            {
                toJSON: () => ({
                    id: 1,
                    file_id: 10,
                    folder_id: null,
                    file: { id: 10, name: 'doc.pdf' },
                    folder: null,
                    token: 'abc-uuid',
                    password_hash: 'hashed',
                    expires_at: '2026-12-31',
                    permission: 'READ',
                    recipient: null,
                    createdAt: '2026-01-01'
                })
            },
            {
                toJSON: () => ({
                    id: 2,
                    file_id: null,
                    folder_id: 5,
                    file: null,
                    folder: { id: 5, name: 'Photos' },
                    token: null,
                    password_hash: null,
                    expires_at: null,
                    permission: 'WRITE',
                    recipient: { id: 99, username: 'bob', email: 'bob@test.com' },
                    createdAt: '2026-02-01'
                })
            }
        ]);

        const result = await ShareService.getMyShares(ownerId);

        expect(result).toHaveLength(2);
        expect(result[0].shareType).toBe('public');
        expect(result[0].type).toBe('file');
        expect(result[0].hasPassword).toBe(true);
        expect(result[0].token).toBe('abc-uuid');
        expect(result[1].shareType).toBe('private');
        expect(result[1].type).toBe('folder');
        expect(result[1].recipient.username).toBe('bob');
    });

    it('devrait retourner un tableau vide si aucun partage', async () => {
        (Share.findAll as any).mockResolvedValueOnce([]);

        const result = await ShareService.getMyShares(ownerId);

        expect(result).toEqual([]);
    });
});

describe('ShareService.getItemShares', () => {
    const ownerId = 42;

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait retourner les partages d\'un fichier', async () => {
        (File.findOne as any).mockResolvedValueOnce({ id: 10, user_id: ownerId });
        (Share.findAll as any).mockResolvedValueOnce([
            {
                toJSON: () => ({
                    id: 1,
                    token: 'pub-token',
                    password_hash: null,
                    expires_at: null,
                    permission: 'READ',
                    recipient: null,
                    createdAt: '2026-01-01'
                })
            }
        ]);

        const result = await ShareService.getItemShares(ownerId, { type: 'file', id: 10 });

        expect(result).toHaveLength(1);
        expect(result[0].shareType).toBe('public');
        expect(result[0].hasPassword).toBe(false);
    });

    it('devrait retourner les partages d\'un dossier', async () => {
        (Folder.findOne as any).mockResolvedValueOnce({ id: 5, user_id: ownerId });
        (Share.findAll as any).mockResolvedValueOnce([
            {
                toJSON: () => ({
                    id: 2,
                    token: null,
                    password_hash: null,
                    expires_at: null,
                    permission: 'WRITE',
                    recipient: { id: 99, username: 'alice', email: 'alice@test.com' },
                    createdAt: '2026-01-01'
                })
            }
        ]);

        const result = await ShareService.getItemShares(ownerId, { type: 'folder', id: 5 });

        expect(result).toHaveLength(1);
        expect(result[0].shareType).toBe('private');
        expect(result[0].recipient.username).toBe('alice');
    });

    it('devrait échouer si pas propriétaire du fichier', async () => {
        (File.findOne as any).mockResolvedValueOnce(null);

        await expect(ShareService.getItemShares(ownerId, { type: 'file', id: 999 }))
            .rejects.toThrow('introuvable');
    });

    it('devrait échouer si pas propriétaire du dossier', async () => {
        (Folder.findOne as any).mockResolvedValueOnce(null);

        await expect(ShareService.getItemShares(ownerId, { type: 'folder', id: 999 }))
            .rejects.toThrow('introuvable');
    });
});

describe('ShareService.updateShare', () => {
    const ownerId = 42;

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('devrait modifier la permission', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn().mockResolvedValue(true) };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        await ShareService.updateShare(ownerId, 1, { permission: 'WRITE' });

        expect(mockShare.update).toHaveBeenCalledWith({ permission: 'WRITE' });
    });

    it('devrait ajouter un mot de passe', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn().mockResolvedValue(true) };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        await ShareService.updateShare(ownerId, 1, { password: 'newpass' });

        expect(mockShare.update).toHaveBeenCalledWith({ password_hash: 'hashed_newpass' });
    });

    it('devrait retirer un mot de passe avec null', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn().mockResolvedValue(true) };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        await ShareService.updateShare(ownerId, 1, { password: null });

        expect(mockShare.update).toHaveBeenCalledWith({ password_hash: null });
    });

    it('devrait modifier la date d\'expiration', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn().mockResolvedValue(true) };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        const futureDate = '2027-12-31T23:59:59Z';
        await ShareService.updateShare(ownerId, 1, { expiresAt: futureDate });

        expect(mockShare.update).toHaveBeenCalledWith({ expires_at: new Date(futureDate) });
    });

    it('devrait retirer la date d\'expiration avec null', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn().mockResolvedValue(true) };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        await ShareService.updateShare(ownerId, 1, { expiresAt: null });

        expect(mockShare.update).toHaveBeenCalledWith({ expires_at: null });
    });

    it('devrait échouer si date d\'expiration dans le passé', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn() };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        await expect(ShareService.updateShare(ownerId, 1, { expiresAt: '2020-01-01T00:00:00Z' }))
            .rejects.toThrow('futur');
    });

    it('devrait échouer si partage introuvable', async () => {
        (Share.findOne as any).mockResolvedValueOnce(null);

        await expect(ShareService.updateShare(ownerId, 999, { permission: 'READ' }))
            .rejects.toThrow('introuvable');
    });

    it('devrait échouer si pas propriétaire', async () => {
        (Share.findOne as any).mockResolvedValueOnce(null);

        await expect(ShareService.updateShare(99, 1, { permission: 'READ' }))
            .rejects.toThrow('introuvable');
    });

    it('devrait modifier plusieurs champs en même temps', async () => {
        const mockShare = { id: 1, owner_id: ownerId, update: vi.fn().mockResolvedValue(true) };
        (Share.findOne as any).mockResolvedValueOnce(mockShare);

        await ShareService.updateShare(ownerId, 1, {
            permission: 'WRITE',
            password: 'secure123',
            expiresAt: '2027-06-15T12:00:00Z'
        });

        expect(mockShare.update).toHaveBeenCalledWith({
            permission: 'WRITE',
            password_hash: 'hashed_secure123',
            expires_at: new Date('2027-06-15T12:00:00Z')
        });
    });
});
