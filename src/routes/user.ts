import { Router, Request, Response } from 'express';
import { getMe, getUserById } from "../controllers/user";
import User from '../models/User';

const usersRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Récupérer les informations de l'utilisateur connecté
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     quota_id:
 *                       type: integer
 *                       example: 2
 *                     used_bytes:
 *                       type: integer
 *                       example: 1048576
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-01T10:00:00Z
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-02T10:00:00Z
 *       400:
 *         description: ID utilisateur invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Utilisateur introuvable
 */
usersRouter.get('/me', async (req: Request, res: Response) => {
    return getMe(req, res);
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Récupérer les informations d'un utilisateur par son ID
 *     operationId: getUserById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     quota_id:
 *                       type: integer
 *                       example: 2
 *                     used_bytes:
 *                       type: integer
 *                       example: 1048576
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-01T10:00:00Z
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-02T10:00:00Z
 *       400:
 *         description: ID utilisateur invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Utilisateur introuvable
 */
usersRouter.get('/:id', async (req: Request, res: Response) => {
    return getUserById(req, res);
});

export default usersRouter;