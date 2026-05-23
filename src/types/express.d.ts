declare global {
    namespace Express {
        interface Request {
            user: {
                id: number;
                email: string;
                terms_accepted: boolean;
            };
        }
    }
}

export {};
