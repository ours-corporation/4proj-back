import { Request, Response } from 'express';
import SearchService from '../services/search';
import { SearchFilters } from '../validator/search';

export const searchContent = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        
        // req.query a été validé et transformé par Zod
        const filters = req.query as unknown as SearchFilters;

        const results = await SearchService.search(userId, filters);
        
        res.json(results);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la recherche" });
    }
};