import { Router } from 'express';
import { createFolder } from '../controllers/folder';
import { requireAuth } from '../middleware/auth'; // Ton middleware d'authentification

const folderRouter = Router();

// Route POST /folders
// Body attendu : { "name": "Mon Dossier", "parent_id": 12 (optionnel) }
folderRouter.post('/', requireAuth, createFolder);

export default folderRouter;