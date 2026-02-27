import multer from 'multer';
import os from 'os';

// On utilise diskStorage pour que Node.js écrive dans le dossier /tmp du serveur
// Cela protège ta RAM, même pour des fichiers de 30 Go.
const storage = multer.diskStorage({
    destination: os.tmpdir(), // Dossier temporaire de l'OS
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, '4proj-tmp-' + uniqueSuffix);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 * 1024 
    }
});

export default upload;