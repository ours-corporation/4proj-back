import { File, Folder } from '../models';
import { Op, WhereOptions } from 'sequelize';
import { SearchFilters } from '../validator/search';

class SearchService {

    async search(userId: number, filters: SearchFilters) {
        const { q, trash, category, minSize, maxSize, after, before } = filters;
        const type = filters.type || 'all';
        
        const trashCondition = trash 
            ? { [Op.not]: null } 
            : { [Op.is]: null };

        const commonWhere: any = {
            user_id: userId,
            trashed_at: trashCondition
        };

        if (after || before) {
            commonWhere.createdAt = {};
            if (after) commonWhere.createdAt[Op.gte] = after;
            if (before) commonWhere.createdAt[Op.lte] = before;
        }

        let files: File[] = [];
        let folders: Folder[] = [];

        if (type === 'all' || type === 'file') {
            const fileWhere: any = { ...commonWhere };

            if (q) {
                const searchTerm = `%${q}%`;
                const searchExtension = `%${q.replace('.', '')}%`; 

                fileWhere[Op.or] = [
                    { name: { [Op.iLike]: searchTerm } },
                    { extension: { [Op.iLike]: searchExtension } }
                ];
            }

            if (minSize || maxSize) {
                fileWhere.size_bytes = {};
                if (minSize) fileWhere.size_bytes[Op.gte] = minSize;
                if (maxSize) fileWhere.size_bytes[Op.lte] = maxSize;
            }

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
                                { [Op.iLike]: 'application/vnd.openxmlformats-%' },
                                { [Op.iLike]: 'text/%' }
                            ]
                        };
                        break;
                }
            }

            files = await File.findAll({
                where: fileWhere as WhereOptions,
                order: [['updatedAt', 'DESC']]
            });
        }

        if ((type === 'all' || type === 'folder') && !category && !minSize && !maxSize) {
            const folderWhere: any = { ...commonWhere };
            
            if (q) {
                folderWhere.name = { [Op.iLike]: `%${q}%` };
            }

            folders = await Folder.findAll({
                where: folderWhere as WhereOptions,
                order: [['updatedAt', 'DESC']]
            });
        }

        return { files, folders };
    }
}

export default new SearchService();