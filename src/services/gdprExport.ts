import { User } from '../models/user';
import { File } from '../models/file';
import { Folder } from '../models/folder';
import { Share } from '../models/share';
import { Quota } from '../models/quota';
import { Op } from 'sequelize';

export async function buildGdprExport(userId: number) {
    const user = await User.findByPk(userId, {
        include: [{ model: Quota }],
    });

    if (!user) throw new Error('Utilisateur introuvable');

    // Méthode d'authentification (déduite, sans exposer les identifiants OAuth)
    const authMethods: string[] = [];
    if (user.password) authMethods.push('password');
    if (user.google_id) authMethods.push('google');
    if (user.github_id) authMethods.push('github');

    const account = {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.email_verified,
        authMethods,
        hasProfilePicture: !!user.profile_picture_key,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };

    const quota = user.quota
        ? {
              plan: user.quota.name,
              quotaBytes: Number(user.quota.quota_bytes),
              usedBytes: Number(user.used_bytes),
          }
        : null;

    // Fichiers actifs (hors corbeille)
    const activeFiles = await File.findAll({
        where: { user_id: userId, trashed_at: null },
        include: [{ model: Folder, attributes: ['id', 'name'] }],
        order: [['createdAt', 'ASC']],
    });

    // Fichiers en corbeille
    const trashedFiles = await File.findAll({
        where: { user_id: userId, trashed_at: { [Op.not]: null } },
        include: [{ model: Folder, attributes: ['id', 'name'] }],
        order: [['trashed_at', 'ASC']],
    });

    const mapFile = (f: File) => ({
        id: f.id,
        name: f.name,
        extension: f.extension,
        fullName: f.fullName,
        sizeBytes: Number(f.size_bytes),
        mimeType: f.mime_type,
        folderId: f.folder_id,
        folderName: (f.folder as Folder | null)?.name ?? null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        trashedAt: f.trashed_at ?? null,
    });

    // Dossiers (tous, arborescence plate)
    const folders = await Folder.findAll({
        where: { user_id: userId },
        order: [['createdAt', 'ASC']],
    });

    const mapFolder = (f: Folder) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        trashedAt: f.trashed_at ?? null,
    });

    // Partages envoyés
    const sentShares = await Share.findAll({
        where: { owner_id: userId },
        include: [
            { model: File, attributes: ['id', 'name', 'extension'] },
            { model: Folder, attributes: ['id', 'name'] },
            { model: User, as: 'recipient', attributes: ['id', 'email', 'username'] },
        ],
        order: [['createdAt', 'ASC']],
    });

    const mapSentShare = (s: Share) => ({
        id: s.id,
        type: s.recipient_id ? 'private' : 'public',
        permission: s.permission,
        hasPassword: !!s.password_hash,
        token: s.token ?? null,
        expiresAt: s.expires_at ?? null,
        createdAt: s.createdAt,
        sharedItem: s.file
            ? { type: 'file', id: s.file.id, name: (s.file as File).fullName }
            : s.folder
            ? { type: 'folder', id: s.folder.id, name: s.folder.name }
            : null,
        recipient: s.recipient
            ? { id: s.recipient.id, email: s.recipient.email, username: s.recipient.username }
            : null,
    });

    // Partages reçus
    const receivedShares = await Share.findAll({
        where: { recipient_id: userId },
        include: [
            { model: File, attributes: ['id', 'name', 'extension'] },
            { model: Folder, attributes: ['id', 'name'] },
            { model: User, as: 'owner', attributes: ['id', 'email', 'username'] },
        ],
        order: [['createdAt', 'ASC']],
    });

    const mapReceivedShare = (s: Share) => ({
        id: s.id,
        permission: s.permission,
        createdAt: s.createdAt,
        expiresAt: s.expires_at ?? null,
        sharedItem: s.file
            ? { type: 'file', id: s.file.id, name: (s.file as File).fullName }
            : s.folder
            ? { type: 'folder', id: s.folder.id, name: s.folder.name }
            : null,
        sharedBy: s.owner
            ? { id: s.owner.id, email: s.owner.email, username: s.owner.username }
            : null,
    });

    return {
        exportedAt: new Date().toISOString(),
        account,
        quota,
        files: {
            active: activeFiles.map(mapFile),
            trashed: trashedFiles.map(mapFile),
        },
        folders: folders.map(mapFolder),
        shares: {
            sent: sentShares.map(mapSentShare),
            received: receivedShares.map(mapReceivedShare),
        },
    };
}
