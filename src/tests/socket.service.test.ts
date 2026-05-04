import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as ioclient, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { initSocket, emitToUser } from '../services/socket';

const JWT_SECRET = 'test_secret';
process.env.JWT_SECRET = JWT_SECRET;

const makeToken = (payload: object, secret = JWT_SECRET) =>
    jwt.sign(payload, secret, { expiresIn: '1m' });

const PORT = 9999;
let httpServer: http.Server;
let serverUrl: string;

beforeAll(() => {
    httpServer = http.createServer();
    initSocket(httpServer, ['*']);
    httpServer.listen(PORT);
    serverUrl = `http://localhost:${PORT}`;
});

afterAll(() => {
    httpServer.close();
});

const connectSocket = (opts: object = {}): Promise<Socket> =>
    new Promise((resolve, reject) => {
        const socket = ioclient(serverUrl, { ...opts, reconnection: false });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
    });

const connectSocketExpectError = (opts: object = {}): Promise<string> =>
    new Promise((resolve) => {
        const socket = ioclient(serverUrl, { ...opts, reconnection: false });
        socket.on('connect_error', (err) => {
            socket.disconnect();
            resolve(err.message);
        });
    });

describe('Socket auth middleware', () => {
    it('rejette une connexion sans token', async () => {
        const errMsg = await connectSocketExpectError({ auth: {} });
        expect(errMsg).toContain('Authentication required');
    });

    it('rejette une connexion avec un token invalide', async () => {
        const errMsg = await connectSocketExpectError({ auth: { token: 'invalid.token.here' } });
        expect(errMsg).toContain('Invalid or expired token');
    });

    it('rejette un token signé avec le mauvais secret', async () => {
        const token = makeToken({ id: 1, email: 'a@b.com' }, 'wrong_secret');
        const errMsg = await connectSocketExpectError({ auth: { token } });
        expect(errMsg).toContain('Invalid or expired token');
    });

    it('accepte une connexion avec un token valide', async () => {
        const token = makeToken({ id: 42, email: 'user@test.com' });
        const socket = await connectSocket({ auth: { token } });
        expect(socket.connected).toBe(true);
        socket.disconnect();
    });
});

describe('emitToUser', () => {
    it('émet un événement reçu par le client connecté', async () => {
        const userId = 7;
        const token = makeToken({ id: userId, email: 'user@test.com' });
        const socket = await connectSocket({ auth: { token } });

        const received = await new Promise<{ used_bytes: number }>((resolve) => {
            socket.on('storage:updated', resolve);
            emitToUser(userId, 'storage:updated', { used_bytes: 1024 });
        });

        expect(received.used_bytes).toBe(1024);
        socket.disconnect();
    });

    it("n'envoie rien à un autre utilisateur", async () => {
        const userId = 10;
        const otherUserId = 11;
        const token = makeToken({ id: userId, email: 'user@test.com' });
        const socket = await connectSocket({ auth: { token } });

        let received = false;
        socket.on('storage:updated', () => { received = true; });

        emitToUser(otherUserId, 'storage:updated', { used_bytes: 999 });

        await new Promise(r => setTimeout(r, 100));
        expect(received).toBe(false);
        socket.disconnect();
    });
});
