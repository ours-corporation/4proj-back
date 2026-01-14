import {Request, Response} from "express";
import User from "../models/User";

interface RegisterBody {
    username?: string;
    email?: string;
}

export const updateUserValidator = async (req: Request, res: Response, actualEmail: string) => {
    try {
        const body: RegisterBody = req.body;

        if (body.username) {
            if (body.username.length < 3 || body.username.length > 30) {
                return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
            }
        }

        if (!body.email) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!body.email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ where: { email: body.email } });
        if (existingUser && body.email !== actualEmail) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        return null;
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}