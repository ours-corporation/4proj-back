import path from 'path';
import fs, { existsSync } from 'fs';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { Folder, File, Share, User, Quota } from '../models';
import ShareService from './share';
import ThumbnailService from './thumbnail';

const UPLOAD_ROOT = '/app/uploads';

class FolderService {

    async createFolder(name: string, userId: number, parentId: number | null) {
        if (parentId) {
            const parentFolder = await Folder.findByPk(parentId);
            if (!parentFolder || parentFolder.trashed_at) throw new Error("Dossier parent introuvable.");

            if (parentFolder.user_id !== userId) {
                const access = await ShareService.hasFolderAccess(userId, parentId);
                if (access !== 'WRITE') {
                     throw new Error("Accès interdit : Vous ne pouvez pas créer de dossier ici.");
                }
            }
        }

        return await Folder.create({
            name,
            user_id: userId, 
            parent_id: parentId
        });
    }

    async getFolderContent(folderId: number | null, userId: number) {
        if (!folderId) {
            return this.getRootContent(userId);
        }

        const folder = await this.findFolderOrThrow(folderId);
        const permission = await this.verifyAccessOrThrow(folder, userId);

        const [breadcrumbs, contents] = await Promise.all([
            this.buildBreadcrumbs(folder, userId),
            this.fetchContents(folderId, userId)
        ]);

        return {
            current: { ...folder.toJSON(), permission },
            breadcrumbs,
            folders: contents.folders,
            files: contents.files
        };
    }

    async createZipStream(folderId: number, folderName: string, outputStream: NodeJS.WritableStream): Promise<void> {
        const filesToZip = await this.getAllFilesInFolder(folderId, folderName);

        if (filesToZip.length === 0) {
            throw new Error("Le dossier est vide.");
        }

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.pipe(outputStream);
        archive.on('error', (err) => { throw err; });

        for (const file of filesToZip) {
            if (existsSync(file.physicalPath)) {
                archive.file(file.physicalPath, { name: file.archivePath });
            }
        }
        await archive.finalize();
    }

    async streamFolderZip(folderId: number, userId: number, outputStream: NodeJS.WritableStream): Promise<void> {
        const folder = await this.findFolderOrThrow(folderId);
        await this.verifyAccessOrThrow(folder, userId);
        await this.createZipStream(folderId, folder.name, outputStream);
    }

    public async getAllFilesInFolder(folderId: number, currentPath: string): Promise<{ physicalPath: string, archivePath: string }[]> {
        let results: { physicalPath: string, archivePath: string }[] = [];

        const files = await File.findAll({ where: { folder_id: folderId, trashed_at: null } });
        for (const file of files) {
            results.push({
                physicalPath: path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key),
                archivePath: path.join(currentPath, file.fullName) 
            });
        }

        const subfolders = await Folder.findAll({ where: { parent_id: folderId, trashed_at: null } });
        for (const sub of subfolders) {
            const newPath = path.join(currentPath, sub.name);
            const subFiles = await this.getAllFilesInFolder(sub.id, newPath);
            results = results.concat(subFiles);
        }

        return results;
    }

    async moveFolder(folderId: number, userId: number, destinationParentId: number | null) {
        const folder = await this.findFolderOrThrow(folderId);

        if (folder.trashed_at) throw new Error("Impossible de déplacer un dossier dans la corbeille.");

        const access = await this.verifyAccessOrThrow(folder, userId);
        if (access !== 'OWNER') {
            throw new Error("Seul le propriétaire peut déplacer un dossier.");
        }

        if (destinationParentId !== null) {
            if (destinationParentId === folderId) {
                throw new Error("Impossible de déplacer un dossier dans lui-même.");
            }

            await this.checkCircularMove(folderId, destinationParentId);
            await this.verifyDestinationFolder(destinationParentId, userId);
        } else {
            if (folder.user_id !== userId) {
                throw new Error("Seul le propriétaire peut déplacer un dossier vers la racine.");
            }
        }

        await folder.update({ parent_id: destinationParentId });
        return folder;
    }

    async renameFolder(folderId: number, userId: number, name: string) {
        const folder = await this.findFolderOrThrow(folderId);

        if (folder.trashed_at) throw new Error("Impossible de renommer un dossier dans la corbeille.");

        const access = await this.verifyAccessOrThrow(folder, userId);
        if (access !== 'OWNER') {
            throw new Error("Seul le propriétaire peut renommer un dossier.");
        }

        await folder.update({ name });
        return folder;
    }

    async copyFolder(folderId: number, userId: number) {
        const folder = await this.findFolderOrThrow(folderId);

        const access = await this.verifyAccessOrThrow(folder, userId);
        if (access !== 'OWNER' && access !== 'WRITE') {
            throw new Error("Accès interdit pour ce dossier.");
        }

        if (folder.trashed_at) throw new Error("Impossible de copier un dossier dans la corbeille.");

        const totalSize = await this.calculateFolderSize(folderId);
        if (totalSize > 0) {
            await this.checkUserQuota(userId, totalSize);
        }

        const existingNames = await this.getExistingSiblingFolderNames(folder.parent_id);
        const copyName = this.generateCopyName(folder.name, existingNames);

        const newFolder = await Folder.create({
            name: copyName,
            user_id: userId,
            parent_id: folder.parent_id
        });

        await this.copyFolderContents(folderId, newFolder.id, userId);

        if (totalSize > 0) {
            await User.update(
                { used_bytes: User.sequelize!.literal(`used_bytes + ${totalSize}`) },
                { where: { id: userId } }
            );
        }

        return newFolder;
    }

    async verifyDestinationFolder(destinationFolderId: number, userId: number) {
        const destinationFolder = await Folder.findByPk(destinationFolderId);

        if (!destinationFolder || destinationFolder.trashed_at) {
            throw new Error("Dossier de destination introuvable.");
        }

        if (destinationFolder.user_id !== userId) {
            const folderAccess = await ShareService.hasFolderAccess(userId, destinationFolderId);
            if (!folderAccess || folderAccess === 'READ') {
                throw new Error("Accès interdit pour le dossier de destination.");
            }
        }

        return destinationFolder;
    }

    private async checkCircularMove(folderId: number, destinationId: number) {
        let currentId: number | null = destinationId;

        while (currentId !== null) {
            if (currentId === folderId) {
                throw new Error("Déplacement impossible : référence circulaire détectée.");
            }
            const parent: any = await Folder.findByPk(currentId);
            if (!parent) break;
            currentId = parent.parent_id;
        }
    }

    private async getRootContent(userId: number) {
        const contents = await this.fetchContents(null, userId);
        return {
            current: null,
            breadcrumbs: [{ id: null, name: 'Accueil' }],
            folders: contents.folders,
            files: contents.files
        };
    }

    private async findFolderOrThrow(folderId: number) {
        const folder = await Folder.findByPk(folderId);
        if (!folder) throw new Error("Dossier introuvable.");
        return folder;
    }

    private async verifyAccessOrThrow(folder: any, userId: number): Promise<'READ' | 'WRITE' | 'OWNER'> {
        if (folder.user_id === userId) {
            return 'OWNER';
        }
        const sharedPermission = await ShareService.hasFolderAccess(userId, folder.id);
        if (!sharedPermission) {
            throw new Error("Accès interdit.");
        }
        return sharedPermission;
    }

    private async buildBreadcrumbs(startFolder: any, userId: number) {
        let breadcrumbs = [];
        let tempFolder: any = startFolder;
        let isSharedRoot = false;

        while (tempFolder) {
            breadcrumbs.unshift({
                id: tempFolder.id,
                name: tempFolder.name
            });

            if (tempFolder.user_id !== userId) {
                const directShare = await Share.findOne({
                    where: { recipient_id: userId, folder_id: tempFolder.id }
                });

                if (directShare) {
                    isSharedRoot = true;
                    break;
                }
            }

            if (tempFolder.parent_id && !isSharedRoot) {
                tempFolder = await Folder.findByPk(tempFolder.parent_id);
            } else {
                tempFolder = null;
            }
        }

        if (startFolder.user_id === userId) {
            breadcrumbs.unshift({ id: null, name: 'Accueil' });
        } else {
            breadcrumbs.unshift({ id: 'shared', name: 'Partagés avec moi' });
        }

        return breadcrumbs;
    }

    private async calculateFolderSize(folderId: number): Promise<number> {
        const fileSize = Number(await File.sum('size_bytes', { where: { folder_id: folderId, trashed_at: null } })) || 0;

        const subfolders = await Folder.findAll({ where: { parent_id: folderId, trashed_at: null }, attributes: ['id'] });
        let totalSize = fileSize;
        for (const sub of subfolders) {
            totalSize += await this.calculateFolderSize(sub.id);
        }

        return totalSize;
    }

    private async checkUserQuota(userId: number, incomingBytes: number) {
        const user = await User.findByPk(userId, { include: [Quota] });
        if (!user || !user.quota) {
            throw new Error("Utilisateur ou quota introuvable.");
        }

        const maxQuotaBytes = Number(user.quota.quota_bytes);
        const currentUsage = Number(user.used_bytes);

        if (currentUsage + Number(incomingBytes) > maxQuotaBytes) {
            throw new Error("Espace insuffisant. Vous avez atteint votre quota.");
        }
    }

    private async getExistingSiblingFolderNames(parentId: number | null): Promise<string[]> {
        const where: any = { parent_id: parentId, trashed_at: null };
        const folders = await Folder.findAll({ where, attributes: ['name'] });
        return folders.map((f: any) => f.name);
    }

    private generateCopyName(baseName: string, existingNames: string[]): string {
        const candidateName = `${baseName} (copie)`;
        if (!existingNames.includes(candidateName)) return candidateName;

        let counter = 2;
        while (existingNames.includes(`${baseName} (copie ${counter})`)) {
            counter++;
        }
        return `${baseName} (copie ${counter})`;
    }

    private async copyFolderContents(sourceFolderId: number, targetFolderId: number, userId: number) {
        const files = await File.findAll({ where: { folder_id: sourceFolderId, trashed_at: null } });
        for (const file of files) {
            const newPhysicalKey = uuidv4();
            const sourcePath = path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);
            const userDir = path.join(UPLOAD_ROOT, userId.toString());

            const targetPath = path.join(userDir, newPhysicalKey);
            await fs.promises.mkdir(userDir, { recursive: true });
            await fs.promises.copyFile(sourcePath, targetPath);

            await ThumbnailService.copyThumbnails(file.physical_key, file.user_id, newPhysicalKey, userId);

            await File.create({
                name: file.name,
                extension: file.extension,
                size_bytes: file.size_bytes,
                mime_type: file.mime_type,
                physical_key: newPhysicalKey,
                user_id: userId,
                folder_id: targetFolderId
            });
        }

        const subfolders = await Folder.findAll({ where: { parent_id: sourceFolderId, trashed_at: null } });
        for (const sub of subfolders) {
            const newSub = await Folder.create({
                name: sub.name,
                user_id: userId,
                parent_id: targetFolderId
            });
            await this.copyFolderContents(sub.id, newSub.id, userId);
        }
    }

    private async fetchContents(folderId: number | null, userId: number) {
        const folderWhere = folderId 
            ? { parent_id: folderId, trashed_at: null } 
            : { parent_id: null, user_id: userId, trashed_at: null };
            
        const fileWhere = folderId 
            ? { folder_id: folderId, trashed_at: null } 
            : { folder_id: null, user_id: userId, trashed_at: null };

        const [folders, files] = await Promise.all([
            Folder.findAll({ where: folderWhere, order: [['name', 'ASC']] }),
            File.findAll({ where: fileWhere, order: [['name', 'ASC']] })
        ]);

        const filesWithThumbnails = await Promise.all(
            files.map(async (file: any) => {
                const fileJson = file.toJSON();
                fileJson.thumbnail = ThumbnailService.isImage(file.mime_type)
                    ? await ThumbnailService.getSmallThumbnailBase64(file.physical_key, file.user_id)
                    : null;
                return fileJson;
            })
        );

        return { folders, files: filesWithThumbnails };
    }
}

export default new FolderService();