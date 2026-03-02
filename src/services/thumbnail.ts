import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const UPLOAD_ROOT = '/app/uploads';
const SIZES = { small: 150, medium: 400 } as const;
type ThumbnailSize = keyof typeof SIZES;

class ThumbnailService {

    isImage(mimeType: string): boolean {
        return mimeType.startsWith('image/');
    }

    async generateThumbnails(physicalKey: string, userId: number, sourcePath: string, mimeType: string): Promise<void> {
        if (!this.isImage(mimeType)) return;

        const thumbDir = this.getThumbnailDir(userId);
        if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
        }

        for (const [size, pixels] of Object.entries(SIZES)) {
            const outputPath = this.getThumbnailPath(physicalKey, userId, size as ThumbnailSize);
            try {
                await sharp(sourcePath)
                    .resize(pixels, pixels, { fit: 'cover' })
                    .webp({ quality: 80 })
                    .toFile(outputPath);
            } catch {
                // Silent fail — thumbnail generation is non-critical
            }
        }
    }

    getThumbnailPath(physicalKey: string, userId: number, size: ThumbnailSize): string {
        return path.join(UPLOAD_ROOT, userId.toString(), 'thumbnails', `${physicalKey}-${size}.webp`);
    }

    async getSmallThumbnailBase64(physicalKey: string, userId: number): Promise<string | null> {
        const thumbPath = this.getThumbnailPath(physicalKey, userId, 'small');
        if (!fs.existsSync(thumbPath)) return null;

        const buffer = fs.readFileSync(thumbPath);
        return `data:image/webp;base64,${buffer.toString('base64')}`;
    }

    async deleteThumbnails(physicalKey: string, userId: number): Promise<void> {
        for (const size of Object.keys(SIZES) as ThumbnailSize[]) {
            const thumbPath = this.getThumbnailPath(physicalKey, userId, size);
            if (fs.existsSync(thumbPath)) {
                fs.unlinkSync(thumbPath);
            }
        }
    }

    async copyThumbnails(sourceKey: string, sourceUserId: number, targetKey: string, targetUserId: number): Promise<void> {
        const targetDir = this.getThumbnailDir(targetUserId);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        for (const size of Object.keys(SIZES) as ThumbnailSize[]) {
            const sourcePath = this.getThumbnailPath(sourceKey, sourceUserId, size);
            const targetPath = this.getThumbnailPath(targetKey, targetUserId, size);
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }

    private getThumbnailDir(userId: number): string {
        return path.join(UPLOAD_ROOT, userId.toString(), 'thumbnails');
    }
}

export default new ThumbnailService();
