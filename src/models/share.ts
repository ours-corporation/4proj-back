import { Table, Column, Model, DataType, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, Default } from 'sequelize-typescript';
import { User } from './user';
import { Folder } from './folder';
import { File } from './file';

@Table({
    tableName: 'shares',
    timestamps: true
})
export class Share extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    // --- QUI PARTAGE ? (Propriétaire) ---
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    owner_id!: number;

    @BelongsTo(() => User, 'owner_id')
    owner!: User;

    // --- QUOI ? (Fichier OU Dossier) ---
    @ForeignKey(() => File)
    @Column({ type: DataType.INTEGER, allowNull: true })
    file_id!: number | null;

    @BelongsTo(() => File)
    file!: File | null;

    @ForeignKey(() => Folder)
    @Column({ type: DataType.INTEGER, allowNull: true })
    folder_id!: number | null;

    @BelongsTo(() => Folder)
    folder!: Folder | null;

    // --- MODE 1 : PARTAGE PRIVÉ (Interne) ---
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: true })
    recipient_id!: number | null;

    @BelongsTo(() => User, 'recipient_id')
    recipient!: User | null;

    // --- MODE 2 : LIEN PUBLIC (Externe) ---
    @Column({ type: DataType.STRING, allowNull: true, unique: true })
    token!: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    password_hash!: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    expires_at!: Date | null;

    // --- DROITS ---
    @Default('READ')
    @Column(DataType.ENUM('READ', 'WRITE'))
    permission!: 'READ' | 'WRITE';

    @Default(DataType.NOW)
    @Column({ field: 'created_at', type: DataType.DATE })
    createdAt!: Date;

    @Default(DataType.NOW)
    @Column({ field: 'updated_at', type: DataType.DATE })
    updatedAt!: Date;
}

export default Share;