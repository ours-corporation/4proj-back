import bcrypt from 'bcryptjs';

export const hashString = async (password: string): Promise<string> => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

export const compareString = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};