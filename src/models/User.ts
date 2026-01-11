import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface UserAttributes {
    id?: number;
    email: string;
    password: string;
    quota_id?: number | null;
    used_bytes?: bigint;
    refresh_token?: string | null;
    created_at?: Date;
    updated_at?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
    public id!: number;
    public email!: string;
    public password!: string;
    public quota_id!: number | null;
    public used_bytes!: bigint;
    declare refresh_token?: string | null;
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
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
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
        },
    }
);

export default User;
