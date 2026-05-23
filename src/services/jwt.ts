import jwt from 'jsonwebtoken';

export const generateAccessToken = (
    user: { id: number; email: string ; username: string }
) => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.sign(
        { id: user.id , email: user.email, username: user.username },
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

export const generateResetToken = (userId: number): string => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.sign({ id: userId, type: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyResetToken = (token: string): { id: number; type: string } => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.verify(token, JWT_SECRET) as { id: number; type: string };
};

export const generateVerificationToken = (userId: number): string => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.sign({ id: userId, type: 'email-verification' }, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyVerificationToken = (token: string): { id: number; type: string } => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.verify(token, JWT_SECRET) as { id: number; type: string };
};

export const generateGithubStateToken = (platform: string): string => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.sign({ platform, type: 'github-state' }, JWT_SECRET, { expiresIn: '10m' });
};

export const verifyGithubStateToken = (token: string): { platform: string; type: string } => {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    return jwt.verify(token, JWT_SECRET) as { platform: string; type: string };
};
