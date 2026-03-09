import { Router } from 'express';
import { moveMultipleItems } from '../controllers/file';
import { requireAuth } from '../middleware/auth';
import { moveMultipleItemsSchema } from '../validator/file';
import { validate } from '../middleware/validate';

const itemsRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Opérations batch sur fichiers et dossiers
 */

/**
 * @swagger
 * /items/move:
 *   put:
 *     tags:
 *       - Items
 *     summary: Déplacer plusieurs fichiers et/ou dossiers
 *     description: |
 *       Déplace un ensemble de fichiers et dossiers vers un dossier de destination ou vers la racine.
 *       Le déplacement est en succès partiel : les éléments valides sont déplacés, les erreurs sont retournées.
 *
 *       **Permissions requises :**
 *       - Fichiers : accès OWNER ou WRITE
 *       - Dossiers : accès OWNER uniquement
 *       - Dossier destination : accès OWNER ou WRITE
 *       - Déplacement vers la racine (null) : propriétaire uniquement
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - destination_folder_id
 *             properties:
 *               items:
 *                 type: array
 *                 description: Liste des éléments à déplacer
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - id
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [file, folder]
 *                       example: file
 *                     id:
 *                       type: integer
 *                       example: 1
 *               destination_folder_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du dossier de destination (null pour la racine)
 *                 example: 5
 *     responses:
 *       200:
 *         description: Résultat du déplacement (succès partiel possible)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 moved:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [file, folder]
 *                       id:
 *                         type: integer
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [file, folder]
 *                       id:
 *                         type: integer
 *                       error:
 *                         type: string
 *       400:
 *         description: Données invalides
 */
itemsRouter.put('/move', requireAuth, validate(moveMultipleItemsSchema), moveMultipleItems);

export default itemsRouter;
