import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface QuotaAttributes {
    id?: number; // autoIncrement
    name: string;
    quota_bytes?: bigint;
    price?: number;
}

class Quota extends Model<QuotaAttributes> implements QuotaAttributes {
    public id!: number;
    public name!: string;
    public quota_bytes!: bigint;
    public price!: number;
}

Quota.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        quota_bytes: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 32212254720, // 30 Go par défaut
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
        },
    },
    {
        sequelize,
        modelName: 'Quota',
        tableName: 'quota',
        timestamps: false,
    }
);

export default Quota;
