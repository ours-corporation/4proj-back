import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_ROOT = '/app/uploads';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PROFILE_PICTURE_DIMENSION = 512; // px (carré)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type ProfilePictureQuality = 'low' | 'medium' | 'high';

const QUALITY_MAP: Record<ProfilePictureQuality, number> = {
    low: 40,
    medium: 75,
    high: 95,
};

class ProfilePictureService {

    getProfileDir(userId: number): string {
        return path.join(UPLOAD_ROOT, userId.toString(), 'profile');
    }

    getProfilePicturePath(userId: number, key: string): string {
        return path.join(this.getProfileDir(userId), `${key}.webp`);
    }

    validateUpload(file: Express.Multer.File): void {
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error(`La photo de profil ne doit pas dépasser ${MAX_SIZE_BYTES / 1024 / 1024} Mo.`);
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.');
        }
    }

    async saveProfilePicture(file: Express.Multer.File, userId: number): Promise<string> {
        this.validateUpload(file);

        const profileDir = this.getProfileDir(userId);
        if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
        }

        const key = uuidv4();
        const outputPath = this.getProfilePicturePath(userId, key);

        await sharp(file.path)
            .resize(PROFILE_PICTURE_DIMENSION, PROFILE_PICTURE_DIMENSION, { fit: 'cover', position: 'centre' })
            .webp({ quality: QUALITY_MAP.high })
            .toFile(outputPath);

        // Nettoyage du fichier temporaire
        fs.unlinkSync(file.path);

        return key;
    }

    async getProfilePictureBuffer(userId: number, key: string, quality: ProfilePictureQuality = 'medium'): Promise<Buffer> {
        const filePath = this.getProfilePicturePath(userId, key);
        if (!fs.existsSync(filePath)) {
            throw new Error('Photo de profil introuvable.');
        }

        const q = QUALITY_MAP[quality];
        return sharp(filePath).webp({ quality: q }).toBuffer();
    }

    deleteProfilePicture(userId: number, key: string): void {
        const filePath = this.getProfilePicturePath(userId, key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

export default new ProfilePictureService();
