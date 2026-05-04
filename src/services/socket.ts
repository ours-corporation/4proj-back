import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './jwt';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-events';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: TypedServer;

export const initSocket = (httpServer: HttpServer, allowedOrigins: string[]) => {
    io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const payload = verifyAccessToken(token) as { id: number; email: string };
            (socket as any).userId = payload.id;
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = (socket as any).userId as number;
        socket.join(`user:${userId}`);
    });

    return io;
};

export const getIO = (): TypedServer => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

export const emitToUser = <E extends keyof ServerToClientEvents>(
    userId: number,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0]
) => {
    if (!io) return;
    (io.to(`user:${userId}`) as any).emit(event, payload);
};
