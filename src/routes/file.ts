import { Router } from 'express';
import multer from 'multer';
import { uploadFile, downloadFile } from '../controllers/file';
import { requireAuth } from '../middleware/auth';

const filesRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: Gestion des fichiers (Upload, Download)
 */

/**
 * @swagger
 * /files/upload:
 *   post:
 *     tags:
 *       - Files
 *     summary: Uploader un fichier
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Le fichier à uploader
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du dossier parent (optionnel)
 *     responses:
 *       201:
 *         description: Fichier uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 size_bytes:
 *                   type: integer
 *                 mime_type:
 *                   type: string
 *       400:
 *         description: Fichier manquant ou erreur de validation
 *       413:
 *         description: Fichier trop volumineux ou quota dépassé
 *       500:
 *         description: Erreur serveur
 */
filesRouter.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  uploadFile
);

/**
 * @swagger
 * /files/{id}/download:
 *   get:
 *     tags:
 *       - Files
 *     summary: Télécharger un fichier
 *     description: >
 *       Renvoie le flux binaire du fichier avec les bons headers
 *       pour forcer le téléchargement.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à télécharger
 *     responses:
 *       200:
 *         description: Fichier trouvé, le téléchargement commence
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Fichier introuvable ou accès interdit
 *       500:
 *         description: Erreur lors de la lecture du fichier
 */
filesRouter.get(
  '/:id/download',
  requireAuth,
  downloadFile
);

export default filesRouter;
