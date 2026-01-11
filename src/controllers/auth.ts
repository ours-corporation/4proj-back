import { Request, Response } from 'express';
import User from '../models/User';
import {loginValidator, registerValidator} from '../validator/auth';
import { compareString, hashString } from '../services/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/jwt';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (await loginValidator(req, res)) return;

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const ok = await compareString(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const accessToken = generateAccessToken({ id: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ id: user.id });
        const hashedRefresh = await hashString(refreshToken);

        await user.update({ refresh_token: hashedRefresh });

        // Option: set httpOnly cookie for refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return res.json({ accessToken });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        // support body or cookie
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
        if (!refreshToken) return res.status(400).json({ error: 'No refresh token provided' });

        let payload: any;
        try {
            payload = verifyRefreshToken(refreshToken) as any;
        } catch {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const user = await User.findByPk(payload.id);
        if (!user || !user.refresh_token) return res.status(401).json({ error: 'Invalid refresh token' });

        const matches = await compareString(refreshToken, user.refresh_token);
        if (!matches) return res.status(401).json({ error: 'Invalid refresh token' });

        // rotate tokens
        const newAccess = generateAccessToken({ id: user.id, email: user.email });
        const newRefresh = generateRefreshToken({ id: user.id });
        const newHashed = await hashString(newRefresh);
        await user.update({ refresh_token: newHashed });

        res.cookie('refreshToken', newRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return res.json({ accessToken: newAccess });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
        if (!refreshToken) {
            res.clearCookie('refreshToken');
            return res.status(200).json({ ok: true });
        }

        // try to decode to get user id (no verify needed to identify)
        try {
            const payload = verifyRefreshToken(refreshToken) as any;
            const user = await User.findByPk(payload.id);
            if (user) {
                await user.update({ refresh_token: null });
            }
        } catch {
            // ignore invalid token on logout
        }

        res.clearCookie('refreshToken');
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (await registerValidator(req, res)) return;

        const hashedPassword = await hashString(password);

        const newUser = await User.create({
            email,
            password: hashedPassword,
            quota_id: 1,
        });

        const user = {
            id: newUser.id,
            email: newUser.email,
        };

        res.status(201).json({ user });

    } catch (error) {
        console.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
