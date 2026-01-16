import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { User } from './user';

@Table({
    tableName: 'quota',
    timestamps: false
})
export class Quota extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    name!: string;

    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        defaultValue: 32212254720 // 30 Go par défaut
    })
    quota_bytes!: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    })
    price!: number;

    // --- RELATIONS ---
    
    @HasMany(() => User)
    users!: User[];
}

export default Quota;