import { Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { User, Quota } from '../models';
import { compareString, hashString } from '../services/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateVerificationToken, verifyVerificationToken, generateResetToken, verifyResetToken } from '../services/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/mail';
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email }, include: [Quota] });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if(!user.password || user.google_id) return res.status(401).json( { error: 'Invalid credentials' } );

        const ok = await compareString(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        if (!user.email_verified) {
            return res.status(403).json({ error: 'Veuillez vérifier votre adresse email avant de vous connecter.' });
        }

        const accessToken = generateAccessToken({ id: user.id, email: user.email, username: user.username });
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
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

        if (!refreshToken) return res.status(400).json({ error: 'No refresh token provided' });

        if (typeof refreshToken !== 'string') {
            return res.status(400).json({ error: 'Invalid refresh token format' });
        }

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

        const newAccess = generateAccessToken({ id: user.id, email: user.email , username: user.username });
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
        } catch { }
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
            email_verified: false,
        });

        const token = generateVerificationToken(newUser.id);
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        try {
            await sendVerificationEmail(email, verificationUrl);
        } catch (mailErr) {
            console.error('Erreur envoi email de vérification :', mailErr);
        }

        return res.status(201).json({
            user: { id: newUser.id, email: newUser.email },
            message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
        });


    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const resendVerification = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email requis.' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || user.email_verified || user.google_id || user.github_id) {
        return res.status(200).json({ message: 'Si un compte non vérifié existe, un email a été envoyé.' });
    }

    const token = generateVerificationToken(user.id);
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
        await sendVerificationEmail(email, verificationUrl);
    } catch (mailErr) {
        console.error('Erreur renvoi email de vérification :', mailErr);
    }

    return res.status(200).json({ message: 'Si un compte non vérifié existe, un email a été envoyé.' });
};

export const verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token manquant.' });
    }

    try {
        const payload = verifyVerificationToken(token);

        if (payload.type !== 'email-verification') {
            return res.status(400).json({ error: 'Token invalide.' });
        }

        const user = await User.findByPk(payload.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        if (user.email_verified) {
            return res.status(200).json({ already: true, message: 'Email déjà vérifié.' });
        }

        await user.update({ email_verified: true });

        return res.status(200).json({ success: true, message: 'Email vérifié avec succès.' });
    } catch {
        return res.status(400).json({ error: 'Token expiré ou invalide.' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    const genericResponse = { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email requis.' });
    }

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(200).json(genericResponse);
        }

        if (user.google_id && !user.password) {
            return res.status(200).json({ oauthOnly: true, provider: 'google' });
        }
        if (user.github_id && !user.password) {
            return res.status(200).json({ oauthOnly: true, provider: 'github' });
        }

        const token = generateResetToken(user.id);
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        try {
            await sendPasswordResetEmail(email, resetUrl);
        } catch (mailErr) {
            console.error('Erreur envoi email de réinitialisation :', mailErr);
        }

        return res.status(200).json(genericResponse);
    } catch {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token manquant.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    try {
        const payload = verifyResetToken(token);

        if (payload.type !== 'password-reset') {
            return res.status(400).json({ error: 'Token invalide.' });
        }

        const user = await User.findByPk(payload.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        const hashedPassword = await hashString(password);
        await user.update({ password: hashedPassword, refresh_token: null });

        return res.status(200).json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
    } catch {
        return res.status(400).json({ error: 'Token expiré ou invalide.' });
    }
};

const allowedOrigins = (process.env.APP_URL ?? '').split(',').map((u) => u.trim()).filter(Boolean);

function isRedirectUriAllowed(redirectUri: string): boolean {
    try {
        const { origin } = new URL(redirectUri);
        return allowedOrigins.some((allowed) => allowed === origin);
    } catch {
        return false;
    }
}

export const authWithGoogle = async (req: Request, res: Response) => {
    try {
        const { code, redirect_uri, id_token: directIdToken } = req.body;

        let id_token: string | undefined;

        if (directIdToken) {
            // Mobile flow: id_token sent directly from Google Sign-In SDK
            id_token = directIdToken;
        } else if (code) {
            // Web flow: exchange authorization code for tokens
            if (!redirect_uri || !isRedirectUriAllowed(redirect_uri)) {
                return res.status(400).json({ error: "redirect_uri non autorisé" });
            }

            const params = new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri,
                grant_type: "authorization_code",
            });

            const rep = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
            });

            if (!rep.ok) {
                return res.status(401).json({ error: "Échec de l’authentification Google" });
            }

            const data = await rep.json();
            id_token = data.id_token;
        } else {
            return res.status(400).json({ error: "code ou id_token requis" });
        }

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
                email_verified: true,
            });
        }

        return issueTokens(res, user);
    } catch (err) {
        return res.status(500).json({ error: "Erreur serveur" });
    }
};

export const authWithGithub = async (req: Request, res: Response) => {
    try {
        const { code, redirect_uri } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Authorization code is required" });
        }

        if (!redirect_uri || !isRedirectUriAllowed(redirect_uri)) {
            return res.status(400).json({ error: "redirect_uri non autorisé" });
        }

        const rep = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.GITHUB_CLIENT_ID!,
                client_secret: process.env.GITHUB_CLIENT_SECRET!,
                code,
                redirect_uri,
            }).toString(),
        });

        if (!rep.ok) {
            return res.status(401).json({ error: "Échec de l’authentification Github" });
        }

        const data = await rep.json();
        const { access_token } = data;

        if (!access_token) {
            return res.status(500).json({ error: "Token Github invalide" });
        }

        const repGetUser = await fetch("https://api.github.com/user", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                'Authorization': `Bearer ${access_token}`,
            },
        });

        const dataUser = await repGetUser.json();
        const github_id = dataUser.id;
        const username = dataUser.login;

        const repGetEmails = await fetch("https://api.github.com/user/emails", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                'Authorization': `Bearer ${access_token}`,
            },
        });

        const dataEmails = await repGetEmails.json();
        const primaryEmailObj = dataEmails.find((emailObj: any) => emailObj.primary && emailObj.verified);
        if (!primaryEmailObj) {
            return res.status(500).json({ error: "Aucun email principal vérifié trouvé sur le compte Github" });
        }
        const email = primaryEmailObj.email;

        let user = await User.findOne({ where: { email } });

        if (user) {
            if (user.github_id == github_id) {
            } else if (!user.github_id) {
                return res.status(409).json({
                    error: "Un compte avec cet email existe déjà sans Github.",
                });
            } else {
                return res.status(401).json({
                    error: "Compte Github invalide.",
                });
            }
        } else {
            user = await User.create({
                username,
                email,
                github_id,
                quota_id: 1,
                email_verified: true,
            });
        }

        return issueTokens(res, user);
    } catch (err) {
        return res.status(500).json({ error: "Erreur serveur" });
    }
};

const issueTokens = async (res: Response, user: User) => {
    const accessToken = generateAccessToken({id: user.id, email: user.email, username: user.username});

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
