import { Request, Response } from 'express';
import User from '../models/User';
import {loginValidator, registerValidator} from '../validator/auth';
import { compareString, hashString } from '../services/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/jwt';
import {constants} from "node:os";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (await loginValidator(req, res)) return;

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if(!user.password || user.google_id) return res.status(401).json( { error: 'Invalid credentials' } );

        const ok = await compareString(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const accessToken = generateAccessToken({ id: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ id: user.id });

        const hashedRefresh = await hashString(refreshToken);

        await user.update({ refresh_token: hashedRefresh });

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
        } catch (error) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const user = await User.findByPk(payload.id);
        if (!user || !user.refresh_token) return res.status(401).json({ error: 'Invalid refresh token' });

        const matches = await compareString(refreshToken, user.refresh_token);
        if (!matches) return res.status(401).json({ error: 'Invalid refresh token' });

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

        try {
            const payload = verifyRefreshToken(refreshToken) as any;
            const user = await User.findByPk(payload.id);
            if (user) {
                await user.update({ refresh_token: null });
            }
        } catch {
            // Ignore errors during logout
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
        const { username, email, password } = req.body;

        if (await registerValidator(req, res)) return;

        //todo : trouver un moyen d'avoir de vraies faux usernames
        let newUsername: string;
        if(username == null || username == "") {
            newUsername = 'user' + Math.floor(Math.random() * 1000000);
        } else {
            newUsername = username;
        }

        const hashedPassword = await hashString(password);

        const newUser = await User.create({
            username: newUsername,
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

export const authWithGoogle = async (req: Request, res: Response) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Authorization code is required" });
        }

        const params = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            grant_type: "authorization_code",
        });

        const rep = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        console.log(rep.status, await rep.clone().text());

        if (!rep.ok) {
            return res.status(401).json({ error: "Échec de l’authentification Google" });
        }

        const data = await rep.json();
        const { id_token } = data;

        if (!id_token) {
            return res.status(500).json({ error: "Token Google invalide" });
        }

        const payload = jwt.decode(id_token) as jwt.JwtPayload | null;

        if (!payload || !payload.email || !payload.sub) {
            return res.status(500).json({
                error: "Une erreur est survenue lors de la connexion avec Google",
            });
        }

        const email = payload.email;
        const google_id = payload.sub;
        const username =
            payload.name || `user${Math.floor(Math.random() * 1_000_000)}`;

        let user = await User.findOne({ where: { email } });

        if (user) {
            if (user.google_id === google_id) {
                // reconnexion OK
            } else if (!user.google_id) {
                return res.status(409).json({
                    error: "Un compte avec cet email existe déjà sans Google.",
                });
            } else {
                return res.status(401).json({
                    error: "Compte Google invalide.",
                });
            }
        } else {
            user = await User.create({
                username,
                email,
                google_id,
                quota_id: 1,
            });
        }

        return issueTokens(res, user);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
};

const issueTokens = async (res: Response, user: User) => {
    const accessToken = generateAccessToken({id: user.id, email: user.email,});

    const refreshToken = generateRefreshToken({ id: user.id });

    const hashedRefresh = await hashString(refreshToken);

    await user.update({ refresh_token: hashedRefresh });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
};
