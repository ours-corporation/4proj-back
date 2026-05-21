import { Router, Request, Response } from 'express';
import { getMe, updateMe, deleteMe, updatePassword, getUserById, uploadProfilePicture, getProfilePicture, deleteProfilePicture, getStorageStats, getGdprExport } from "../controllers/user";
import { validate } from '../middleware/validate';
import {updatePasswordValidatorSchema, updateUserValidatorSchema} from "../validator/user";
import multer from 'multer';
import os from 'os';

const profilePictureUpload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (_req, _file, cb) => {
            cb(null, '4proj-avatar-' + Date.now() + '-' + Math.round(Math.random() * 1e9));
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.'));
        }
    },
});

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
 * /users/me/storage:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Statistiques d'utilisation du stockage
 *     description: Retourne l'utilisation globale du forfait et la repartition par categorie (video, photo, document, autre) en octets et en pourcentage. Les fichiers dans la corbeille sont exclus.
 *     responses:
 *       200:
 *         description: Statistiques de stockage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StorageStats'
 *       401:
 *         description: Non authentifie
 *       404:
 *         description: Utilisateur introuvable
 *       500:
 *         description: Erreur serveur
 */
usersRouter.get('/me/storage', async (req: Request, res: Response) => { return getStorageStats(req, res); });

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
 * /users/me/profile-picture:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Uploader ou remplacer la photo de profil
 *     description: |
 *       Permet à l'utilisateur connecté d'uploader ou de remplacer sa photo de profil.
 *       - Taille maximale : 5 Mo
 *       - Formats acceptés : JPEG, PNG, WebP, GIF
 *       - L'image est redimensionnée en 512×512 px (crop centré) et convertie en WebP.
 *       - L'ancienne photo est supprimée automatiquement.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image à utiliser comme photo de profil (max 5 Mo, JPEG/PNG/WebP/GIF)
 *     responses:
 *       200:
 *         description: Photo de profil mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Photo de profil mise à jour avec succès.
 *       400:
 *         description: Fichier manquant ou invalide (format ou taille)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La photo de profil ne doit pas dépasser 5 Mo.
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur introuvable
 *       500:
 *         description: Erreur serveur
 */
usersRouter.put('/me/profile-picture', profilePictureUpload.single('file'), async (req: Request, res: Response) => { return uploadProfilePicture(req, res); });

/**
 * @swagger
 * /users/me/profile-picture:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Supprimer la photo de profil
 *     description: Supprime la photo de profil de l'utilisateur connecté.
 *     responses:
 *       204:
 *         description: Photo de profil supprimée avec succès
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Aucune photo de profil à supprimer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Aucune photo de profil à supprimer.
 *       500:
 *         description: Erreur serveur
 */
usersRouter.delete('/me/profile-picture', async (req: Request, res: Response) => { return deleteProfilePicture(req, res); });

/**
 * @swagger
 * /users/me/profile-picture:
 *   get:
 *     operationId: getMyProfilePicture
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Récupérer sa propre photo de profil
 *     description: |
 *       Retourne la photo de profil de l'utilisateur connecté au format WebP.
 *       Le paramètre `quality` permet de choisir le niveau de compression :
 *       - `low` : qualité 40 (image légère)
 *       - `medium` : qualité 75 (par défaut, bon compromis)
 *       - `high` : qualité 95 (haute fidélité)
 *     parameters:
 *       - name: quality
 *         in: query
 *         required: false
 *         description: Niveau de qualité de l'image retournée
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *     responses:
 *       200:
 *         description: Image WebP de la photo de profil
 *         content:
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Qualité invalide
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Aucune photo de profil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Aucune photo de profil.
 *       500:
 *         description: Erreur serveur
 */
usersRouter.get('/me/profile-picture', async (req: Request, res: Response) => {
    req.params.id = String(req.user.id);
    return getProfilePicture(req, res);
});

/**
 * @swagger
 * /users/{id}/profile-picture:
 *   get:
 *     operationId: getProfilePictureById
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Récupérer la photo de profil d'un utilisateur
 *     description: |
 *       Retourne la photo de profil d'un utilisateur au format WebP.
 *       Le paramètre `quality` permet de choisir le niveau de compression :
 *       - `low` : qualité 40 (image légère)
 *       - `medium` : qualité 75 (par défaut, bon compromis)
 *       - `high` : qualité 95 (haute fidélité)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: quality
 *         in: query
 *         required: false
 *         description: Niveau de qualité de l'image retournée
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *     responses:
 *       200:
 *         description: Image WebP de la photo de profil
 *         content:
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID ou qualité invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Qualité invalide. Valeurs acceptées : low, medium, high."
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur ou photo introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Aucune photo de profil.
 *       500:
 *         description: Erreur serveur
 */
usersRouter.get('/:id/profile-picture', async (req: Request, res: Response) => { return getProfilePicture(req, res); });

/**
 * @swagger
 * /users/me/data-export:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Export RGPD des données personnelles
 *     description: |
 *       Retourne l'intégralité des données personnelles détenues sur l'utilisateur
 *       connecté, conformément à l'article 20 du RGPD (droit à la portabilité).
 *
 *       Le JSON inclut :
 *       - **account** : identité, méthodes d'authentification, dates de création
 *       - **quota** : nom du forfait, capacité totale, octets utilisés
 *       - **files** : liste de tous les fichiers actifs et fichiers en corbeille
 *       - **folders** : arborescence complète des dossiers (liste plate)
 *       - **shares.sent** : partages créés par l'utilisateur (publics et privés)
 *       - **shares.received** : partages reçus d'autres utilisateurs
 *
 *       Les données sensibles sont exclues : hash du mot de passe, refresh token,
 *       identifiants OAuth, hash des mots de passe de partage.
 *
 *       La réponse est servie avec un header `Content-Disposition: attachment`
 *       pour déclencher le téléchargement direct depuis un navigateur.
 *     responses:
 *       200:
 *         description: Export JSON des données personnelles
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename="supfile-data-export-1.json"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     username: { type: string }
 *                     email: { type: string }
 *                     emailVerified: { type: boolean }
 *                     authMethods:
 *                       type: array
 *                       items: { type: string, enum: [password, google, github] }
 *                     hasProfilePicture: { type: boolean }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *                 quota:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     plan: { type: string }
 *                     quotaBytes: { type: integer }
 *                     usedBytes: { type: integer }
 *                 files:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: array
 *                       items: { type: object }
 *                     trashed:
 *                       type: array
 *                       items: { type: object }
 *                 folders:
 *                   type: array
 *                   items: { type: object }
 *                 shares:
 *                   type: object
 *                   properties:
 *                     sent:
 *                       type: array
 *                       items: { type: object }
 *                     received:
 *                       type: array
 *                       items: { type: object }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
usersRouter.get('/me/data-export', async (req: Request, res: Response) => { return getGdprExport(req, res); });

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