import { Table, Column, Model, DataType, HasMany, BelongsTo, ForeignKey, PrimaryKey, AutoIncrement, Scopes,Default } from 'sequelize-typescript';
import { Quota } from './quota';
import { Folder } from './folder';
import { File } from './file';
import { Share } from './share';

@Scopes(() => ({
    minimal: {
        attributes: ['id', 'email', 'username']
    },
    withoutPassword: {
        attributes: { exclude: ['password', 'refresh_token', 'google_id', 'github_id'] }
    }
}))
@Table({
    tableName: 'users',
    timestamps: false 
})
export class User extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false, 
        defaultValue: 'default_username'
    })
    username!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    email!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true // Nullable car google_id ou github_id possible
    })
    password!: string | null;

    // --- RELATIONS QUOTA ---

    @ForeignKey(() => Quota)
    @Column(DataType.INTEGER)
    quota_id!: number | null;

    @BelongsTo(() => Quota)
    quota!: Quota | null;

    // --- DONNÉES MÉTIER ---

    @Default(0)
    @Column({
        type: DataType.BIGINT,
        allowNull: false
    })
    used_bytes!: number;

    @Column(DataType.STRING)
    refresh_token!: string | null;

    // --- SOCIAL LOGIN ---

    @Column({
        type: DataType.STRING,
        unique: true,
        allowNull: true
    })
    google_id!: string | null;

    // Github ID pour login via GitHub OAuth
    @Column({
        type: DataType.STRING,
        unique: true,
        allowNull: true
    })
    github_id!: string | null;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        field: 'email_verified'
    })
    email_verified!: boolean;

    // Clé physique de la photo de profil (UUID, stockée dans /app/uploads/{userId}/profile/)
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    profile_picture_key!: string | null;

    // --- RELATIONS FICHIERS / DOSSIERS ---

    @HasMany(() => Folder)
    folders!: Folder[];

    @HasMany(() => File)
    files!: File[];
    
    // Shares crées
    @HasMany(() => Share, 'owner_id')
    ownedShares!: Share[];

    // Shares partagés
    @HasMany(() => Share, 'recipient_id')
    receivedShares!: Share[];

    @Default(DataType.NOW)
    @Column({ field: 'created_at', type: DataType.DATE })
    createdAt!: Date;

    @Default(DataType.NOW)
    @Column({ field: 'updated_at', type: DataType.DATE })
    updatedAt!: Date;

    // --- MÉTHODES UTILITAIRES ---
    
    public async loadQuotaIfRequested(includeQuota: boolean): Promise<void> {
        if (includeQuota) {
            await this.reload({ include: [Quota] });
        }
    }
}

export default User;
