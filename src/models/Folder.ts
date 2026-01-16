import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, PrimaryKey, AutoIncrement,Default } from 'sequelize-typescript'; // Ajoute 'Default' aux imports
import { User } from './user';
import { File } from './file';
import { Share } from './share';

@Table({
    tableName: 'folders',
    timestamps: true
})
export class Folder extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column({ type: DataType.STRING, allowNull: false })
    name!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    user_id!: number;

    @BelongsTo(() => User)
    user!: User;

    @ForeignKey(() => Folder)
    @Column({ type: DataType.INTEGER, allowNull: true })
    parent_id!: number | null;

    @BelongsTo(() => Folder)
    parent!: Folder | null;

    @HasMany(() => Folder)
    children!: Folder[];

    @HasMany(() => File)
    files!: File[];

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

export default Folder;