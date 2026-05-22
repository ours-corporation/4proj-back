import 'reflect-metadata';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/sequelize';
import { User, Folder, File, Quota } from '../models';
import bcrypt from 'bcryptjs';

dotenv.config();

const SEED_USER_EMAIL = 'test@test.com';
const SEED_USER_PASSWORD = 'password123';

async function seed() {
    console.log('Démarrage du Seeder...');

    try {
        await sequelize.authenticate();
        console.log('Connecté à la base de données.');

        // ATTENTION : force: true vide toute la base !
        await sequelize.sync({ force: true });
        console.log('Base de données nettoyée.');

        const defaultQuota = await Quota.create({
            name: 'Gratuit',
            quota_bytes: 32212254720, // 30 Go
            price: 0
        });

        const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
        const user = await User.create({
            username: 'Jean Testeur',
            email: SEED_USER_EMAIL,
            password: passwordHash,
            quota_id: defaultQuota.id,
            used_bytes: 5000000
        });
        console.log(`Utilisateur créé: ${user.email} (MDP: ${SEED_USER_PASSWORD})`);

        // ====================================================
        // SCÉNARIO 1 : ARBORESCENCE VIVANTE (Normale)
        // ====================================================

        const docsFolder = await Folder.create({
            name: 'Documents',
            user_id: user.id,
            parent_id: null
        });

        await File.create({
            name: 'facture_edf.pdf',
            size_bytes: 102400,
            mime_type: 'application/pdf',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: docsFolder.id
        });

        const adminFolder = await Folder.create({
            name: 'Administratif',
            user_id: user.id,
            parent_id: docsFolder.id
        });

        await File.create({
            name: 'impots_2024.pdf',
            size_bytes: 204800,
            mime_type: 'application/pdf',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: adminFolder.id
        });

        console.log('Arborescence vivante créée.');

        // ====================================================
        // SCÉNARIO 2 : CORBEILLE SIMPLE (Fichier orphelin)
        // ====================================================

        const simpleDeleteId = uuidv4();
        const simpleDeleteDate = new Date();

        await File.create({
            name: 'photo_ratee.jpg',
            size_bytes: 5000000,
            mime_type: 'image/jpeg',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: null,
            trashed_at: simpleDeleteDate,
            deletion_id: simpleDeleteId
        });

        console.log('Fichier supprimé simple créé.');

        // ====================================================
        // SCÉNARIO 3 : CORBEILLE COMPLEXE (Batch Delete)
        // ====================================================

        const folderBatchId = uuidv4();
        const folderDeleteDate = new Date('2026-01-15T14:00:00');

        const oldFileBatchId = uuidv4();
        const oldFileDeleteDate = new Date('2026-01-10T10:00:00');

        const trashedFolder = await Folder.create({
            name: 'Projet Abandonné',
            user_id: user.id,
            parent_id: null,
            trashed_at: folderDeleteDate,
            deletion_id: folderBatchId
        });

        // Supprimé EN MÊME TEMPS que le dossier → masqué dans la corbeille (même deletion_id)
        await File.create({
            name: 'logo_final.png',
            size_bytes: 15000,
            mime_type: 'image/png',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: trashedFolder.id,
            trashed_at: folderDeleteDate,
            deletion_id: folderBatchId
        });

        // Supprimé AVANT le dossier → visible dans la corbeille (deletion_id différent)
        await File.create({
            name: 'notes_brouillon.txt',
            size_bytes: 500,
            mime_type: 'text/plain',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: trashedFolder.id,
            trashed_at: oldFileDeleteDate,
            deletion_id: oldFileBatchId
        });

        console.log('Scénario Batch Delete complexe créé.');

    } catch (error) {
        console.error('Erreur lors du seed :', error);
    } finally {
        await sequelize.close();
        console.log('Fin du script.');
    }
}

seed();
