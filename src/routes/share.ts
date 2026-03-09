import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPublicShareSchema, createPrivateShareSchema, updateShareSchema, itemSharesSchema } from '../validator/share';
import { createPublicShare, createPrivateShare, getReceivedShares, revokeShare, getMyShares, updateShare } from '../controllers/share';

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
 * /shares/sent:
 *   get:
 *     tags:
 *       - Shares
 *     summary: Lister mes partages envoyés
 *     description: |
 *       Retourne tous les partages créés par l'utilisateur connecté (publics et privés).
 *       Chaque entrée indique le type (public/privé), l'élément partagé, le destinataire,
 *       la permission, et pour les liens publics : le token, si un mot de passe est défini, et l'expiration.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des partages envoyés
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                     enum: [file, folder]
 *                   item:
 *                     type: object
 *                   shareType:
 *                     type: string
 *                     enum: [public, private]
 *                   recipient:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                   token:
 *                     type: string
 *                     nullable: true
 *                   hasPassword:
 *                     type: boolean
 *                   expiresAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   permission:
 *                     type: string
 *                     enum: [READ, WRITE]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
shareRouter.get('/sent',requireAuth,getMyShares);

/**
 * @swagger
 * /shares/{id}:
 *   put:
 *     tags:
 *       - Shares
 *     summary: Modifier un partage existant
 *     description: |
 *       Permet au propriétaire de modifier un partage :
 *       - Changer la permission (READ/WRITE)
 *       - Ajouter, modifier ou retirer un mot de passe (liens publics)
 *       - Modifier ou retirer la date d'expiration (liens publics)
 *       Envoyer `null` pour retirer un mot de passe ou une expiration.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du partage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permission:
 *                 type: string
 *                 enum: [READ, WRITE]
 *               password:
 *                 type: string
 *                 nullable: true
 *                 description: Nouveau mot de passe (null pour retirer)
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Nouvelle date d'expiration (null pour retirer)
 *     responses:
 *       200:
 *         description: Partage mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Partage introuvable
 */
shareRouter.put('/:id',requireAuth,validate(updateShareSchema),updateShare);

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
