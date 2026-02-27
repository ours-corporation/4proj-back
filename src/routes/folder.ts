import { Router } from 'express';
import { createFolder, getFolder, copyFolder, downloadFolder } from '../controllers/folder';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createFolderSchema, getFolderSchema, copyFolderSchema } from '../validator/folder';
import { moveToTrash, restoreFromTrash, deletePermanently } from '../controllers/trash';
import { trashIdSchema } from '../validator/trash';

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
 *                 example: "Vacances 2024"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *     responses:
 *       201:
 *         description: Dossier créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Dossier parent introuvable
 */
folderRouter.post('/',requireAuth,validate(createFolderSchema),createFolder);

/**
 * @swagger
 * /folders:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Récupérer le contenu de la racine (Root)
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
 *                       name:
 *                         type: string
 *                 folders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 */
folderRouter.get('/', requireAuth, getFolder);

/**
 * @swagger
 * /folders/{id}:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Récupérer le contenu d'un dossier
 *     description: Renvoie les sous-dossiers, fichiers, fil d'ariane et permissions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         description: ID du dossier (ou null ou absent pour la racine)
 *         schema:
 *           type: integer
 *           nullable: true
 *     responses:
 *       200:
 *         description: Contenu du dossier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FolderContentResponse'
 *       403:
 *         description: Accès refusé (ni propriétaire, ni partagé)
 *       404:
 *         description: Dossier introuvable
 */
folderRouter.get('/:id',requireAuth,validate(getFolderSchema),getFolder);

/**
 * @swagger
 * /folders/{id}/copy:
 *   post:
 *     tags:
 *       - Folders
 *     summary: Dupliquer un dossier (récursif)
 *     description: |
 *       Crée une copie complète du dossier au même emplacement (même parent).
 *       La copie inclut tous les sous-dossiers et fichiers (récursif).
 *       Le dossier copié et tout son contenu appartiennent à l'utilisateur qui effectue la copie.
 *       Nécessite un accès OWNER ou WRITE sur le dossier source.
 *       Le quota est vérifié avant la copie (somme de tous les fichiers).
 *       Le nom suit le format "nom (copie)", "nom (copie 2)", etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier à copier
 *     responses:
 *       201:
 *         description: Dossier copié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Le dossier est dans la corbeille
 *       403:
 *         description: Accès interdit (permissions insuffisantes)
 *       404:
 *         description: Dossier introuvable
 *       413:
 *         description: Quota dépassé
 */
folderRouter.post('/:id/copy',requireAuth,validate(copyFolderSchema),copyFolder);

/**
 * @swagger
 * /folders/{id}/trash:
 *   put:
 *     tags:
 *       - Folders
 *     summary: Mettre un dossier à la corbeille (Soft Delete récursif)
 *     description: |
 *       Déplace le dossier et **tout son contenu** vers la corbeille.
 *
 *       - Applique un ID de suppression unique (Batch ID) à tous les enfants.
 *       - Préserve l'historique des fichiers déjà supprimés à l'intérieur.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier à supprimer
 *     responses:
 *       200:
 *         description: Dossier déplacé vers la corbeille.
 *       404:
 *         description: Dossier introuvable.
 */
folderRouter.put('/:id/trash',requireAuth,validate(trashIdSchema),moveToTrash);

/**
 * @swagger
 * /folders/{id}/restore:
 *   put:
 *     tags:
 *       - Folders
 *     summary: Restaurer un dossier
 *     description: |
 *       Restaure le dossier et tout son contenu
 *       (fichiers et sous-dossiers).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier à restaurer
 *     responses:
 *       200:
 *         description: Dossier restauré.
 *       404:
 *         description: Dossier introuvable.
 */
folderRouter.put('/:id/restore',requireAuth,validate(trashIdSchema),restoreFromTrash);

/**
 * @swagger
 * /folders/{id}:
 *   delete:
 *     tags:
 *       - Folders
 *     summary: Supprimer un dossier DÉFINITIVEMENT (Hard Delete récursif)
 *     description: |
 *       **ATTENTION : Irréversible.**
 *
 *       - Supprime le dossier, ses sous-dossiers
 *         et **tous les fichiers** qu'il contient.
 *       - Libère tout l'espace de stockage associé.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier à supprimer définitivement
 *     responses:
 *       200:
 *         description: Dossier et contenu supprimés définitivement.
 *       404:
 *         description: Dossier introuvable.
 */
folderRouter.delete('/:id',requireAuth,validate(trashIdSchema),deletePermanently);

/**
 * @swagger
 * /folders/{id}/download:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Télécharger un dossier entier (ZIP)
 *     description: |
 *       Génère une archive ZIP à la volée. 
 *       Accessible si on est propriétaire OU si on a reçu un accès (via lien privé ou héritage).
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
 *         description: Fichier ZIP généré (Flux / Stream)
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Dossier vide
 *       403:
 *         description: Accès refusé
 */
folderRouter.get('/:id/download', validate(getFolderSchema), requireAuth, downloadFolder);

export default folderRouter;