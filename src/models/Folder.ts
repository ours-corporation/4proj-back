import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface FolderAttributes {
    id?: number;
    user_id: number;
    parent_id?: number | null; // Null si à la racine
    name: string;
    trashed_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
}

class Folder extends Model<FolderAttributes> implements FolderAttributes {
    public id!: number;
    public user_id!: number;
    public parent_id!: number | null;
    public name!: string;
    public trashed_at!: Date | null;
    public created_at!: Date;
    public updated_at!: Date;
}

Folder.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User', // Référence au modèle User
                key: 'id',
            },
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Folder', // Auto-référence pour les sous-dossiers
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        trashed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: 'Folder',
        tableName: 'folders',
        timestamps: false, // Vous gérez vos propres timestamps created_at/updated_at
    }
);

export default Folder;