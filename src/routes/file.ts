import { Router } from 'express';
import multer from 'multer';
// Importe TOUT le contenu du fichier pour voir ce qu'il y a dedans
import { uploadFile } from '../controllers/file'; 
import { requireAuth } from '../middleware/auth'; 



const filesRouter = Router();

// IMPORTANT : On utilise memoryStorage pour avoir accès à file.buffer dans le service
const upload = multer({ storage: multer.memoryStorage() });

// La route POST /files/upload
// 'file' est le nom du champ que tu devras utiliser dans Postman
filesRouter.post('/upload', requireAuth, upload.single('file'), uploadFile);

export default filesRouter;