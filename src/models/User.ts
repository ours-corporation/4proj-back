import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface UserAttributes {
    id?: number;
    username?: string | null;
    email: string;
    password?: string | null;
    quota_id?: number | null;
    used_bytes?: bigint;
    refresh_token?: string | null;
    google_id?: string | null;
    github_id?: string | null;
    created_at?: Date;
    updated_at?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
    public id!: number;
    public username!: string;
    public email!: string;
    public password!: string | null;
    public quota_id!: number | null;
    public used_bytes!: bigint;
    declare refresh_token?: string | null;
    declare google_id?: string | null;
    declare github_id?: string | null;
    public created_at!: Date;
    public updated_at!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        quota_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Quota',
                key: 'id',
            },
        },
        used_bytes: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
        },
        refresh_token: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        google_id: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        github_id: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
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
        modelName: 'User',
        tableName: 'users',
        timestamps: false,
        scopes: {
            minimal: {
                attributes: ['id', 'email'],
            },
            withoutPassword: {
                attributes: { exclude: ['password', "refresh_token", "google_id"] }
            },
        },
    }
);

export default User;
