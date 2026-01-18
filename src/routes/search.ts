import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { searchSchema } from '../validator/search';
import { searchContent } from '../controllers/search';

const searchRouter = Router();

/**
 * @swagger
 * /search:
 *   get:
 *     tags:
 *       - Search
 *     summary: Recherche avancée (Filtres & Corbeille)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Terme de recherche
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: trash
 *         description: Cherche dans la corbeille si true
 *         schema:
 *           type: boolean
 *           default: false
 *
 *       - in: query
 *         name: type
 *         description: Type d’élément recherché
 *         schema:
 *           type: string
 *           enum:
 *             - all
 *             - file
 *             - folder
 *           default: all
 *
 *       - in: query
 *         name: category
 *         description: Filtre par type MIME
 *         schema:
 *           type: string
 *           enum:
 *             - image
 *             - video
 *             - audio
 *             - document
 *
 *       - in: query
 *         name: minSize
 *         description: Taille minimum en octets
 *         schema:
 *           type: integer
 *
 *       - in: query
 *         name: after
 *         description: Créé après cette date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *
 *     responses:
 *       200:
 *         description: Résultats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 folders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 */
searchRouter.get('/',requireAuth,validate(searchSchema),searchContent);

export default searchRouter;
