import { Router } from 'express';
import multer from 'multer';
import { uploadFile, downloadFile, getRecentFiles, updateFile } from '../controllers/file';
import { uploadFiles } from '../controllers/file';
import { requireAuth } from '../middleware/auth';
import { fileIdSchema, recentFileSchema, updateFileSchema, uploadFilesSchema } from '../validator/file';
import { validate } from '../middleware/validate';
import { moveToTrash, restoreFromTrash, deletePermanently } from '../controllers/trash';
import { trashIdSchema } from '../validator/trash';

const filesRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: Gestion des fichiers (Upload, Download, Delete)
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
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Fichier uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Erreur validation
 *       413:
 *         description: Quota dépassé
 */
filesRouter.post('/upload',requireAuth,upload.single('file'), validate(uploadFilesSchema),uploadFile);

/**
 * @swagger
 * /files/{id}/upload:
 *   post:
 *     tags:
 *       - Files
 *     summary: Uploader plusieurs fichiers simultanément
 *     description: Permet d'envoyer jusqu'à 50 fichiers d'un coup dans un dossier spécifique ou à la racine.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               folder_id:
 *                 type: integer
 *                 description: ID du dossier de destination (laisser vide pour la racine)
 *               files:
 *                 type: array
 *                 description: Les fichiers à envoyer (limite 50)
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Fichiers uploadés avec succès
 *       400:
 *         description: Aucun fichier envoyé ou données invalides
 */
filesRouter.post('/uploads', requireAuth, upload.array('files', 50), validate(uploadFilesSchema) ,uploadFiles);

/**
 * @swagger
 * /files/recent:
 *   get:
 *     tags:
 *       - Files
 *     summary: Récupérer les fichiers récents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Nombre de fichiers à récupérer
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Liste des fichiers récents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 */
filesRouter.get('/recent',requireAuth,validate(recentFileSchema),getRecentFiles);

/**
 * @swagger
 * /files/{id}/download:
 *   get:
 *     tags:
 *       - Files
 *     summary: Télécharger un fichier
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
 *         description: Téléchargement du fichier
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Fichier introuvable
 */
filesRouter.get('/:id/download',requireAuth,validate(fileIdSchema),downloadFile);

/**
 * @swagger
 * /files/{id}/trash:
 *   put:
 *     tags:
 *       - Files
 *     summary: Mettre un fichier à la corbeille (Soft Delete)
 *     description: |
 *       Déplace le fichier vers la corbeille.
 *       - Ne libère PAS le quota.
 *       - Le fichier reste restaurable.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à supprimer
 *     responses:
 *       200:
 *         description: Fichier déplacé vers la corbeille.
 *       404:
 *         description: Fichier introuvable.
 */
filesRouter.put('/:id/trash',requireAuth,validate(trashIdSchema),moveToTrash);

/**
 * @swagger
 * /files/{id}/restore:
 *   put:
 *     tags:
 *       - Files
 *     summary: Restaurer un fichier depuis la corbeille
 *     description: |
 *       Restaure le fichier à son emplacement d'origine.
 *
 *       **Gestion des orphelins :**
 *       Si le dossier parent n'existe plus (supprimé définitivement),
 *       le fichier est restauré à la racine.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à restaurer
 *     responses:
 *       200:
 *         description: Fichier restauré.
 *       404:
 *         description: Fichier introuvable.
 */
filesRouter.put('/:id/restore',requireAuth,validate(trashIdSchema),restoreFromTrash);

/**
 * @swagger
 * /files/{id}:
 *   delete:
 *     tags:
 *       - Files
 *     summary: Supprimer un fichier DÉFINITIVEMENT (Hard Delete)
 *     description: |
 *       **ATTENTION : Irréversible.**
 *
 *       - Supprime le fichier du disque dur.
 *       - Supprime la ligne en base de données.
 *       - **Libère l'espace de stockage (Quota) de l'utilisateur.**
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à supprimer définitivement
 *     responses:
 *       200:
 *         description: Fichier supprimé définitivement.
 *       404:
 *         description: Fichier introuvable.
 */
filesRouter.delete('/:id',requireAuth,validate(trashIdSchema),deletePermanently);

/**
 * @swagger
 * /files/{id}:
 *   put:
 *     tags:
 *       - Files
 *     summary: Modifier un fichier (Renommer)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du fichier à modifier
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nouveau nom"
 *     responses:
 *       200:
 *         description: Fichier mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       404:
 *         description: Fichier introuvable
 */
filesRouter.put('/:id',requireAuth,validate(updateFileSchema),updateFile);

export default filesRouter;