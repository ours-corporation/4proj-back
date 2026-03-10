import { Router } from 'express';
import upload from '../middleware/upload';
import { uploadFile, downloadFile, getRecentFiles, updateFile, moveFile, copyFile, getThumbnail, streamFile } from '../controllers/file';
import { uploadFiles } from '../controllers/file';
import { getFileShares } from '../controllers/share';
import { requireAuth } from '../middleware/auth';
import { fileIdSchema, recentFileSchema, updateFileSchema, uploadFilesSchema, moveFileSchema, copyFileSchema, thumbnailSchema } from '../validator/file';
import { itemSharesSchema } from '../validator/share';
import { validate } from '../middleware/validate';
import { moveToTrash, restoreFromTrash, deletePermanently } from '../controllers/trash';
import { trashIdSchema } from '../validator/trash';

const filesRouter = Router();

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
 *               folder_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du dossier de destination (laisser vide pour la racine)
 *     responses:
 *       201:
 *         description: Fichier uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Aucun fichier envoyé ou données invalides
 *       413:
 *         description: Quota dépassé
 */
filesRouter.post('/upload',requireAuth,upload.single('file'), validate(uploadFilesSchema),uploadFile);

/**
 * @swagger
 * /files/uploads:
 *   post:
 *     tags:
 *       - Files
 *     summary: Uploader plusieurs fichiers simultanément
 *     description: Permet d'envoyer jusqu'à 50 fichiers d'un coup dans un dossier spécifique ou à la racine. Limite de 500 Mo par envoi.
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
 *       413:
 *         description: Quota dépassé ou poids total supérieur à 500 Mo
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
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Fichier introuvable
 */
filesRouter.get('/:id/download',requireAuth,validate(fileIdSchema),downloadFile);

/**
 * @swagger
 * /files/{id}/move:
 *   put:
 *     tags:
 *       - Files
 *     summary: Déplacer un fichier vers un autre dossier
 *     description: |
 *       Déplace un fichier vers un dossier de destination ou vers la racine (folder_id: null).
 *       Nécessite un accès OWNER ou WRITE sur le fichier.
 *       Si la destination est un dossier, l'utilisateur doit aussi avoir un accès OWNER ou WRITE dessus.
 *       Seul le propriétaire peut déplacer un fichier vers la racine.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à déplacer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folder_id
 *             properties:
 *               folder_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du dossier de destination (null pour la racine)
 *                 example: 5
 *     responses:
 *       200:
 *         description: Fichier déplacé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Le fichier est dans la corbeille
 *       403:
 *         description: Accès interdit (permissions insuffisantes)
 *       404:
 *         description: Fichier ou dossier de destination introuvable
 */
filesRouter.put('/:id/move',requireAuth,validate(moveFileSchema),moveFile);

/**
 * @swagger
 * /files/{id}/copy:
 *   post:
 *     tags:
 *       - Files
 *     summary: Dupliquer un fichier
 *     description: |
 *       Crée une copie du fichier au même emplacement (même dossier).
 *       Le fichier copié appartient à l'utilisateur qui effectue la copie.
 *       Nécessite un accès OWNER ou WRITE sur le fichier source.
 *       La copie physique est effectuée sur le disque et le quota est vérifié.
 *       Le nom de la copie suit le format "nom (copie)", "nom (copie 2)", etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à copier
 *     responses:
 *       201:
 *         description: Fichier copié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Le fichier est dans la corbeille
 *       403:
 *         description: Accès interdit (permissions insuffisantes)
 *       404:
 *         description: Fichier introuvable
 *       413:
 *         description: Quota dépassé
 */
filesRouter.post('/:id/copy',requireAuth,validate(copyFileSchema),copyFile);

/**
 * @swagger
 * /files/{id}/thumbnail:
 *   get:
 *     tags:
 *       - Files
 *     summary: Récupérer la miniature d'une image
 *     description: |
 *       Retourne la miniature WebP d'un fichier image.
 *       Les miniatures small (150x150) sont aussi incluses en base64 dans `GET /folders/:id`.
 *       Cet endpoint est utile pour récupérer la miniature medium (400x400) au clic.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: string
 *           enum: [small, medium]
 *           default: medium
 *         description: Taille de la miniature (small 150x150, medium 400x400)
 *     responses:
 *       200:
 *         description: Miniature WebP
 *         content:
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Le fichier n'est pas une image
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Fichier ou miniature introuvable
 */
filesRouter.get('/:id/thumbnail',requireAuth,validate(thumbnailSchema),getThumbnail);

/**
 * @swagger
 * /files/{id}/stream:
 *   get:
 *     tags:
 *       - Files
 *     summary: Streamer un fichier (support HTTP Range)
 *     description: |
 *       Permet le streaming partiel d'un fichier (vidéo, audio, etc.) via les en-têtes HTTP Range.
 *       - Sans en-tête Range : retourne le fichier complet (200) avec `Accept-Ranges: bytes`.
 *       - Avec en-tête Range : retourne le segment demandé (206 Partial Content).
 *       - Range invalide : retourne 416 Range Not Satisfiable.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier à streamer
 *       - in: header
 *         name: Range
 *         required: false
 *         schema:
 *           type: string
 *           example: "bytes=0-1023"
 *         description: Plage d'octets demandée (ex. bytes=0-1023)
 *     responses:
 *       200:
 *         description: Fichier complet (sans Range)
 *         headers:
 *           Accept-Ranges:
 *             schema:
 *               type: string
 *               example: bytes
 *       206:
 *         description: Contenu partiel (avec Range)
 *         headers:
 *           Content-Range:
 *             schema:
 *               type: string
 *               example: "bytes 0-1023/4096"
 *           Accept-Ranges:
 *             schema:
 *               type: string
 *               example: bytes
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Fichier introuvable
 *       416:
 *         description: Range non satisfaisable
 */
filesRouter.get('/:id/stream',requireAuth,validate(fileIdSchema),streamFile);

/**
 * @swagger
 * /files/{id}/shares:
 *   get:
 *     tags:
 *       - Files
 *     summary: Lister les partages d'un fichier
 *     description: |
 *       Retourne tous les partages (publics et privés) associés à ce fichier.
 *       Seul le propriétaire du fichier peut consulter cette liste.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier
 *     responses:
 *       200:
 *         description: Liste des partages du fichier
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   shareType:
 *                     type: string
 *                     enum: [public, private]
 *                   recipient:
 *                     type: object
 *                     nullable: true
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
 *       404:
 *         description: Fichier introuvable ou accès refusé
 */
filesRouter.get('/:id/shares',requireAuth,validate(itemSharesSchema),getFileShares);

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
 *       403:
 *         description: Accès interdit (nécessite OWNER ou WRITE)
 *       404:
 *         description: Fichier introuvable
 */
filesRouter.put('/:id',requireAuth,validate(updateFileSchema),updateFile);

export default filesRouter;