import { Router } from 'express';
import { createFolder, getFolder } from '../controllers/folder';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate'; // ✅ Notre nouveau middleware
import { createFolderSchema, getFolderSchema } from '../validator/folder'; // ✅ Nos règles Zod

const folderRouter = Router();

// Créer un dossier : On valide le BODY
folderRouter.post('/', requireAuth, validate(createFolderSchema), createFolder);

// Lire la racine : Pas besoin de validation (pas de paramètres)
folderRouter.get('/', requireAuth, getFolder);

// Lire un dossier spécifique : On valide les PARAMS (:id)
folderRouter.get('/:id', requireAuth, validate(getFolderSchema), getFolder);

export default folderRouter;