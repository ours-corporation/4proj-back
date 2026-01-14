import { Request, Response } from 'express';
import User from '../models/User';

interface RegisterBody {
    username?: string;
    email?: string;
    password?: string;
}

export const loginValidator = async (req: Request, res: Response) => {
    try {
        const body: RegisterBody = req.body;

        if (!body.email || !body.password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!body.email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        return null;
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const registerValidator = async (req: Request, res: Response) => {
    try {
        const body: RegisterBody = req.body;

        if (body.username) {
            if (body.username.length < 3 || body.username.length > 30) {
                return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
            }
        }

        if (!body.email || !body.password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!body.email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (body.password.length < 12) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!/[A-Z]/.test(body.password)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
        }
        if (!/[a-z]/.test(body.password)) {
            return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
        }
        if (!/[0-9]/.test(body.password)) {
            return res.status(400).json({ error: 'Password must contain at least one number' });
        }
        if (!/[!@#$%^&*]/.test(body.password)) {
            return res.status(400).json({ error: 'Password must contain at least one special character (! @ # $ % ^ & *)' });
        }

        const existingUser = await User.findOne({ where: { email: body.email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        return null;
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}