import { Router, Request, Response } from 'express';
import { getMe, updateMe, deleteMe, updatePassword, getUserById } from "../controllers/user";
import { validate } from '../middleware/validate';
import {updatePasswordValidatorSchema, updateUserValidatorSchema} from "../validator/user";

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
 *                     username:
 *                        type: string
 *                        example: johndoe
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
usersRouter.get('/me', async (req: Request, res: Response) => {return getMe(req, res);});

/**
 * @swagger
 * /users/me:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Met à jour les informations de l'utilisateur connecté
 *     description: Permet à l'utilisateur connecté de mettre à jour son email et/ou son nom d'utilisateur.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Nouvel email de l'utilisateur
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 description: Nouveau nom d'utilisateur
 *                 example: john_doe
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour avec succès
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
 *                     username:
 *                       type: string
 *                       example: john_doe
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Utilisateur introuvable
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Erreur serveur
 */
usersRouter.put('/me', async (req: Request, res: Response) => {return updateMe(req, res);});

/**
 * @swagger
 * /users/me:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Supprime l'utilisateur connecté
 *     description: Permet à l'utilisateur connecté de supprimer son compte.
 *     responses:
 *       204:
 *         description: Utilisateur supprimé avec succès
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilisateur introuvable"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur serveur"
 */
usersRouter.delete('/me', async (req: Request, res: Response) => {return deleteMe(req, res);});

/**
 * @swagger
 * /users/me/update-password:
 *   put:
 *     tags:
 *       - Users
 *     summary: Mettre à jour le mot de passe
 *     description: |
 *       Permet à l'utilisateur authentifié de modifier son mot de passe.
 *       Le nouveau mot de passe doit respecter les règles de sécurité suivantes :
 *       - au moins 12 caractères
 *       - une lettre minuscule
 *       - une lettre majuscule
 *       - un chiffre
 *       - un caractère spécial
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lastPassword
 *               - NewPassword
 *             properties:
 *               lastPassword:
 *                 type: string
 *                 description: Ancien mot de passe de l'utilisateur
 *                 example: "AncienMotDePasse123!"
 *               NewPassword:
 *                 type: string
 *                 description: Nouveau mot de passe conforme aux règles de sécurité
 *                 example: "NouveauMotDePasseFort123!"
 *     responses:
 *       200:
 *         description: Mot de passe mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mot de passe mis à jour avec succès
 *       400:
 *         description: Requête invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     wrongPassword:
 *                       value: Ancien mot de passe incorrect
 *                     noPassword:
 *                       value: Cet utilisateur n'a pas de mot de passe défini. Veuillez utiliser la procédure de réinitialisation.
 *                     invalidNewPassword:
 *                       value: Le mot de passe doit contenir au moins 12 caractères
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Utilisateur introuvable
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Erreur serveur
 */
usersRouter.put('/me/update-password', validate(updatePasswordValidatorSchema), async (req: Request, res: Response) => {return updatePassword(req, res);});

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
usersRouter.get('/:id', async (req: Request, res: Response) => {return getUserById(req, res);});

export default usersRouter;