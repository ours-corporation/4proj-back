import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPublicShareSchema,createPrivateShareSchema } from '../validator/share';
import { createPublicShare,createPrivateShare,getReceivedShares,revokeShare } from '../controllers/share';

const shareRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Shares
 *   description: Gestion des partages
 */

/**
 * @swagger
 * /shares/public:
 *   post:
 *     tags:
 *       - Shares
 *     summary: Créer un lien de partage public
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SharePublicInput'
 *     responses:
 *       201:
 *         description: Lien créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 link:
 *                   type: string
 *                   example: "http://localhost:3000/s/uuid-token"
 *                 token:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 */
shareRouter.post('/public',requireAuth,validate(createPublicShareSchema),createPublicShare);

/**
 * @swagger
 * /shares/private:
 *   post:
 *     tags:
 *       - Shares
 *     summary: Partager avec un utilisateur (Invitation)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SharePrivateInput'
 *     responses:
 *       201:
 *         description: Partage créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Share'
 */
shareRouter.post('/private',requireAuth,validate(createPrivateShareSchema),createPrivateShare);

/**
 * @swagger
 * /shares/received:
 *   get:
 *     tags:
 *       - Shares
 *     summary: Lister les éléments partagés avec moi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des partages reçus
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SharedContentList'
 */
shareRouter.get('/received',requireAuth,getReceivedShares);

/**
 * @swagger
 * /shares/{id}:
 *   delete:
 *     tags:
 *       - Shares
 *     summary: Révoquer (supprimer) un partage
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Partage supprimé
 *       404:
 *         description: Partage introuvable
 */
shareRouter.delete('/:id',requireAuth,revokeShare);

export default shareRouter;
