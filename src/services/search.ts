import { File, Folder } from '../models';
import { Op, WhereOptions } from 'sequelize';
import { SearchFilters } from '../validator/search';

class SearchService {

    async search(userId: number, filters: SearchFilters) {
        const { q, trash, type, category, minSize, maxSize, after, before } = filters;
        const searchTerm = `%${q}%`;

        // Si trash=true, on cherche CE QUI EST supprimé.
        const trashFilter = trash 
            ? { [Op.not]: null } 
            : null;

        const commonWhere: WhereOptions = {
            user_id: userId,
            name: { [Op.iLike]: searchTerm },
            trashed_at: trashFilter
        };

        // Ajout filtre Date si présent
        if (after || before) {
            commonWhere.createdAt = {};
            if (after) commonWhere.createdAt[Op.gte] = after;
            if (before) commonWhere.createdAt[Op.lte] = before;
        }

        let files: File[] = [];
        let folders: Folder[] = [];

        if (type === 'all' || type === 'file') {
            const fileWhere: WhereOptions = { ...commonWhere };

            // Filtre Taille
            if (minSize || maxSize) {
                fileWhere.size_bytes = {};
                if (minSize) fileWhere.size_bytes[Op.gte] = minSize;
                if (maxSize) fileWhere.size_bytes[Op.lte] = maxSize;
            }

            // Filtre Catégorie (Mime Type)
            if (category) {
                switch (category) {
                    case 'image':
                        fileWhere.mime_type = { [Op.iLike]: 'image/%' };
                        break;
                    case 'video':
                        fileWhere.mime_type = { [Op.iLike]: 'video/%' };
                        break;
                    case 'audio':
                        fileWhere.mime_type = { [Op.iLike]: 'audio/%' };
                        break;
                    case 'document':
                        fileWhere.mime_type = { 
                            [Op.or]: [
                                { [Op.iLike]: 'application/pdf' },
                                { [Op.iLike]: 'application/msword' },
                                { [Op.iLike]: 'application/vnd.openxmlformats-%' }, // Office
                                { [Op.iLike]: 'text/%' }
                            ]
                        };
                        break;
                }
            }

            files = await File.findAll({
                where: fileWhere,
                order: [['updatedAt', 'DESC']]
            });
        }

        if ((type === 'all' || type === 'folder') && !category && !minSize && !maxSize) {
            folders = await Folder.findAll({
                where: commonWhere,
                order: [['updatedAt', 'DESC']]
            });
        }

        return { files, folders };
    }
}

export default new SearchService();