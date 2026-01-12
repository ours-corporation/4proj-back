import jwt from 'jsonwebtoken';
import User from '../models/User';

export const generateAccessToken = (
    user: { id: number; email: string }
) => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
};

export const generateRefreshToken = (
    user: { id: number }
) => {
    const REFRESH_SECRET = process.env.REFRESH_SECRET as string;
    return jwt.sign(
        { id: user.id },
        REFRESH_SECRET,
        { expiresIn: '30d' }
    );
};

export const verifyAccessToken = (token: string) => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string) => {
    const REFRESH_SECRET = process.env.REFRESH_SECRET as string;
    return jwt.verify(token, REFRESH_SECRET);
};
