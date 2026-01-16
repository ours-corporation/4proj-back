import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getTrash } from '../controllers/trash';

const trashRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Trash
 *   description: Gestion globale de la corbeille
 */

/**
 * @swagger
 * /trash:
 *   get:
 *     tags:
 *       - Trash
 *     summary: Récupérer le contenu visible de la corbeille
 *     description: |
 *       Renvoie la liste des fichiers et dossiers supprimés.
 *
 *       **Logique d'affichage (Windows-style) :**
 *       - Si un dossier et son contenu sont supprimés en même temps, seul le dossier apparaît.
 *       - Si un fichier a été supprimé AVANT son dossier parent, il apparaît séparément (historique conservé).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 folders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
trashRouter.get('/',requireAuth,getTrash);

export default trashRouter;
