import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mock des services avant tout import de controller
vi.mock('../services/socket', () => ({
    emitToUser: vi.fn(),
}));

vi.mock('../services/file', () => ({
    default: {
        uploadSingleFile: vi.fn(),
        uploadMultipleFiles: vi.fn(),
    },
}));

vi.mock('../services/share', () => ({
    default: {
        createPrivateShare: vi.fn(),
        revokeShare: vi.fn(),
        updateShare: vi.fn(),
    },
}));

vi.mock('../models', () => ({
    User: { findByPk: vi.fn() },
    File: { findByPk: vi.fn() },
    Folder: { findByPk: vi.fn() },
}));

import { emitToUser } from '../services/socket';
import FileService from '../services/file';
import ShareService from '../services/share';
import { User } from '../models';

const mockRes = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

const mockReq = (overrides: Partial<Request> = {}): Request =>
    ({ user: { id: 1, email: 'test@test.com' }, body: {}, params: {}, query: {}, ...overrides } as any);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findByPk).mockResolvedValue({ used_bytes: 2048 } as any);
});

describe('uploadFile — emits', () => {
    it('émet file:created et storage:updated après un upload réussi', async () => {
        const fakeFile = { id: 1, name: 'test', user_id: 1 };
        vi.mocked(FileService.uploadSingleFile).mockResolvedValue(fakeFile as any);

        const { uploadFile } = await import('../controllers/file');
        const req = mockReq({ file: { originalname: 'test.txt' } as any, body: {} });
        const res = mockRes();

        await uploadFile(req, res);

        expect(emitToUser).toHaveBeenCalledWith(1, 'file:created', fakeFile);
        expect(emitToUser).toHaveBeenCalledWith(1, 'storage:updated', { used_bytes: 2048 });
    });

    it("n'émet rien si aucun fichier n'est envoyé", async () => {
        const { uploadFile } = await import('../controllers/file');
        const req = mockReq({ file: undefined });
        const res = mockRes();

        await uploadFile(req, res);

        expect(emitToUser).not.toHaveBeenCalled();
    });
});

describe('uploadFiles — emits', () => {
    it('émet file:created pour chaque fichier uploadé', async () => {
        const fakeFiles = [
            { id: 1, name: 'a', user_id: 1 },
            { id: 2, name: 'b', user_id: 1 },
        ];
        vi.mocked(FileService.uploadMultipleFiles).mockResolvedValue(fakeFiles as any);

        const { uploadFiles } = await import('../controllers/file');
        const req = mockReq({ files: [{ originalname: 'a.txt' }, { originalname: 'b.txt' }] as any, body: {} });
        const res = mockRes();

        await uploadFiles(req, res);

        expect(emitToUser).toHaveBeenCalledWith(1, 'file:created', fakeFiles[0]);
        expect(emitToUser).toHaveBeenCalledWith(1, 'file:created', fakeFiles[1]);
        expect(emitToUser).toHaveBeenCalledWith(1, 'storage:updated', { used_bytes: 2048 });
    });
});

describe('createPrivateShare — double emit', () => {
    it('émet share:created vers le propriétaire et share:received vers le destinataire', async () => {
        const fakeShare = { id: 10, owner_id: 1, recipient_id: 2, file_id: 5, folder_id: null, token: null, permission: 'READ', expires_at: null };
        vi.mocked(ShareService.createPrivateShare).mockResolvedValue(fakeShare as any);

        const { createPrivateShare } = await import('../controllers/share');
        const req = mockReq({ body: { fileId: 5, email: 'dest@test.com', permission: 'READ' } });
        const res = mockRes();

        await createPrivateShare(req, res);

        expect(emitToUser).toHaveBeenCalledWith(1, 'share:created', fakeShare);
        expect(emitToUser).toHaveBeenCalledWith(2, 'share:received', fakeShare);
        expect(emitToUser).toHaveBeenCalledTimes(2);
    });
});

describe('revokeShare — emit', () => {
    it('émet share:revoked avec le bon id', async () => {
        vi.mocked(ShareService.revokeShare).mockResolvedValue(undefined as any);

        const { revokeShare } = await import('../controllers/share');
        const req = mockReq({ params: { id: '10' } });
        const res = mockRes();

        await revokeShare(req, res);

        expect(emitToUser).toHaveBeenCalledWith(1, 'share:revoked', { id: 10 });
    });
});
