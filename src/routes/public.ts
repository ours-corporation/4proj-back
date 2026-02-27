import { Router } from 'express';
import { validate } from '../middleware/validate';
import { accessPublicShareSchema } from '../validator/share';
import { accessPublicShare } from '../controllers/share';

const publicRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Accès public (Liens de partage)
 */

/**
 * @swagger
 * /public/access/{token}:
 *   post:
 *     tags:
 *       - Public
 *     summary: Accéder à un contenu via lien public
 *     description: |
 *       Permet de récupérer les informations d'un fichier ou d'un dossier partagé.
 *       - Si le lien est protégé par mot de passe, il doit être envoyé dans le body.
 *       - Si le mot de passe est incorrect ou manquant, l'API demandera de le fournir.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: 'Le token unique du lien (ex: uuid)'
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShareAccessInput'
 *     responses:
 *       200:
 *         description: Contenu récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicContent'
 *       403:
 *         description: Mot de passe requis ou incorrect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Mot de passe requis'
 *                 protected:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Lien invalide ou expiré
 *       410:
 *         description: Lien expiré
 */

publicRouter.post('/access/:token',validate(accessPublicShareSchema),accessPublicShare);

export default publicRouter;
