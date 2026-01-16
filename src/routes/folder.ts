import { Router } from 'express';
import { createFolder, getFolder } from '../controllers/folder';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createFolderSchema, getFolderSchema } from '../validator/folder';

const folderRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Folders
 *   description: Gestion des dossiers et de la navigation
 */

/**
 * @swagger
 * /folders:
 *   post:
 *     tags:
 *       - Folders
 *     summary: Créer un nouveau dossier
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du dossier
 *                 example: "Vacances 2024"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du dossier parent (null pour la racine)
 *                 example: 12
 *     responses:
 *       201:
 *         description: Dossier créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 user_id:
 *                   type: integer
 *                 parent_id:
 *                   type: integer
 *       400:
 *         description: "Données invalides (ex: nom vide)"
 *       404:
 *         description: Dossier parent introuvable
 *       403:
 *         description: Accès interdit au dossier parent
 */
folderRouter.post( '/', requireAuth, validate(createFolderSchema), createFolder);

/**
 * @swagger
 * /folders:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Récupérer le contenu de la racine (Root)
 *     description: >
 *       Renvoie les fichiers et dossiers situés à la racine,
 *       ainsi que le fil d'ariane.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contenu de la racine récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current:
 *                   type: object
 *                   nullable: true
 *                   description: null car c'est la racine
 *                 breadcrumbs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         nullable: true
 *                       name:
 *                         type: string
 *                 folders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       size_bytes:
 *                         type: integer
 */
folderRouter.get('/', requireAuth, getFolder);

/**
 * @swagger
 * /folders/{id}:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Récupérer le contenu d'un dossier spécifique
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier à consulter
 *     responses:
 *       200:
 *         description: Contenu du dossier récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current:
 *                   type: object
 *                   description: Infos du dossier actuel
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                 breadcrumbs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         nullable: true
 *                       name:
 *                         type: string
 *                 folders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       mime_type:
 *                         type: string
 *                       size_bytes:
 *                         type: integer
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Dossier introuvable
 *       403:
 *         description: Accès interdit
 */
folderRouter.get('/:id', requireAuth, validate(getFolderSchema), getFolder);

export default folderRouter;
