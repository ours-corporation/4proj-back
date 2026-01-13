import User from './User';
import Quota from './Quota';
import Folder from './Folder';
import File from './File';

// User <-> Quota
// Un user a un seul quota, un quota peut être assigné à plusieurs users
Quota.hasMany(User, { foreignKey: 'quota_id' });
User.belongsTo(Quota, { foreignKey: 'quota_id' });

// User <-> Folder
// Un user possède plusieurs dossiers
User.hasMany(Folder, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Folder.belongsTo(User, { foreignKey: 'user_id' });

// User <-> File
// Un user possède plusieurs fichiers (utile pour le calcul du quota global)
User.hasMany(File, { foreignKey: 'user_id', onDelete: 'CASCADE' });
File.belongsTo(User, { foreignKey: 'user_id' });

// Folder <-> File
// Un dossier contient plusieurs fichiers
Folder.hasMany(File, { foreignKey: 'folder_id', onDelete: 'CASCADE' });
File.belongsTo(Folder, { foreignKey: 'folder_id' });

// Folder <-> Folder (Auto-référence / Fil d'Ariane)
// Un dossier peut avoir un parent
Folder.belongsTo(Folder, { as: 'parent', foreignKey: 'parent_id' });
// Un dossier peut avoir des enfants (sous-dossiers)
Folder.hasMany(Folder, { as: 'children', foreignKey: 'parent_id', onDelete: 'CASCADE' });


export { User, Quota, Folder, File };