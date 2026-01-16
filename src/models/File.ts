import { Table, Column, Model, DataType, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement,Default, HasMany } from 'sequelize-typescript';
import { User } from './user';
import { Folder } from './folder';
import { Share } from './share';

@Table({
    tableName: 'files',
    timestamps: true 
})
export class File extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column({ type: DataType.STRING, allowNull: false })
    name!: string;

    @Column({ type: DataType.BIGINT, allowNull: false })
    size_bytes!: number;

    @Column({ type: DataType.STRING, allowNull: false })
    mime_type!: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    physical_key!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    user_id!: number;

    @BelongsTo(() => User)
    user!: User;

    @ForeignKey(() => Folder)
    @Column({ type: DataType.INTEGER, allowNull: true })
    folder_id!: number | null;

    @BelongsTo(() => Folder)
    folder!: Folder | null;

    @HasMany(() => Share)
    shares!: Share[];

    @Column({ type: DataType.DATE, allowNull: true, defaultValue: null })
    trashed_at!: Date | null;

    @Column({ type: DataType.STRING, allowNull: true, defaultValue: null })
    deletion_id!: string | null;

    @Default(DataType.NOW)
    @Column({ field: 'created_at', type: DataType.DATE })
    createdAt!: Date;

    @Default(DataType.NOW)
    @Column({ field: 'updated_at', type: DataType.DATE })
    updatedAt!: Date;
}

export default File;