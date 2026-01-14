import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface FileAttributes {
    id?: number;
    user_id: number;
    folder_id?: number | null; // Null si le fichier est à la racine
    name: string;
    physical_key: string; // L'UUID du fichier sur le disque
    size_bytes: bigint;
    mime_type?: string | null;
    trashed_at?: Date | null;
    deleted_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
}

class File extends Model<FileAttributes> implements FileAttributes {
    public id!: number;
    public user_id!: number;
    public folder_id!: number | null;
    public name!: string;
    public physical_key!: string;
    public size_bytes!: bigint;
    public mime_type!: string | null;
    public trashed_at!: Date | null;
    public deleted_at!: Date | null;
    public created_at!: Date;
    public updated_at!: Date;
}

File.init(
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
                model: 'User',
                key: 'id',
            },
        },
        folder_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Folder',
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        physical_key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true, // Sécurité : pas de doublons d'UUID
        },
        size_bytes: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        mime_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        trashed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        deleted_at: {
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
        modelName: 'File',
        tableName: 'files',
        timestamps: false,
    }
);

export default File;