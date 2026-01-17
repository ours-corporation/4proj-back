import 'reflect-metadata'; // Toujours en premier !
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/sequelize';
import { User, Folder, File, Quota } from '../models';
import bcrypt from 'bcryptjs'; // Assure-toi d'avoir npm install bcryptjs @types/bcryptjs

dotenv.config();

const SEED_USER_EMAIL = 'test@test.com';
const SEED_USER_PASSWORD = 'password123';

async function seed() {
    console.log('🌱 Démarrage du Seeder...');

    try {
        // 1. Connexion et Nettoyage (Force Sync va tout supprimer et recréer les tables)
        await sequelize.authenticate();
        console.log('🔌 Connecté à la base de données.');
        
        // ⚠️ ATTENTION : force: true vide toute la base !
        await sequelize.sync({ force: true });
        console.log('🧹 Base de données nettoyée.');

        // 2. Création du Quota par défaut
        const defaultQuota = await Quota.create({
            name: 'Gratuit',
            quota_bytes: 32212254720, // 30 Go
            price: 0
        });

        // 3. Création de l'Utilisateur
        const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
        const user = await User.create({
            username: 'Jean Testeur',
            email: SEED_USER_EMAIL,
            password: passwordHash,
            quota_id: defaultQuota.id,
            used_bytes: 5000000 // On simule 5 Mo utilisés
        });
        console.log(`👤 Utilisateur créé: ${user.email} (MDP: ${SEED_USER_PASSWORD})`);

        // ====================================================
        // SCÉNARIO 1 : ARBORESCENCE VIVANTE (Normale)
        // ====================================================
        
        // Dossier Racine "Documents"
        const docsFolder = await Folder.create({
            name: 'Documents',
            user_id: user.id,
            parent_id: null
        });

        // Fichier dans Documents
        await File.create({
            name: 'facture_edf.pdf',
            size_bytes: 102400, // 100 Ko
            mime_type: 'application/pdf',
            physical_key: uuidv4(), // Fausse clé physique
            user_id: user.id,
            folder_id: docsFolder.id
        });

        // Sous-dossier "Administratif"
        const adminFolder = await Folder.create({
            name: 'Administratif',
            user_id: user.id,
            parent_id: docsFolder.id
        });

        // Fichier dans Sous-dossier
        await File.create({
            name: 'impots_2024.pdf',
            size_bytes: 204800,
            mime_type: 'application/pdf',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: adminFolder.id
        });

        console.log('✅ Arborescence vivante créée.');

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
            folder_id: null, // À la racine
            trashed_at: simpleDeleteDate,
            deletion_id: simpleDeleteId
        });

        console.log('🗑️  Fichier supprimé simple créé.');


        // ====================================================
        // SCÉNARIO 3 : CORBEILLE COMPLEXE (Batch Delete "Windows")
        // ====================================================
        // C'est ici qu'on teste ton intelligence de filtrage

        // Config du Batch de suppression du dossier
        const folderBatchId = uuidv4();
        const folderDeleteDate = new Date('2026-01-15T14:00:00'); // Supprimé à 14h

        // Config du fichier supprimé AVANT (Historique)
        const oldFileBatchId = uuidv4();
        const oldFileDeleteDate = new Date('2026-01-10T10:00:00'); // Supprimé 5 jours avant

        // 1. Création du dossier supprimé
        const trashedFolder = await Folder.create({
            name: 'Projet Abandonné',
            user_id: user.id,
            parent_id: null,
            trashed_at: folderDeleteDate,
            deletion_id: folderBatchId
        });

        // 2. Fichier supprimé EN MÊME TEMPS que le dossier (Contenu standard)
        // -> Doit être MASQUÉ dans la corbeille car même deletion_id que le parent
        await File.create({
            name: 'logo_final.png',
            size_bytes: 15000,
            mime_type: 'image/png',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: trashedFolder.id,
            trashed_at: folderDeleteDate, // Même date
            deletion_id: folderBatchId    // Même ID de suppression !
        });

        // 3. Fichier supprimé AVANT le dossier (Historique conservé)
        // -> Doit être VISIBLE dans la corbeille car deletion_id différent
        await File.create({
            name: 'notes_brouillon.txt',
            size_bytes: 500,
            mime_type: 'text/plain',
            physical_key: uuidv4(),
            user_id: user.id,
            folder_id: trashedFolder.id,
            trashed_at: oldFileDeleteDate, // Date antérieure
            deletion_id: oldFileBatchId    // ID différent !
        });

        console.log('🗑️📦 Scénario Batch Delete complexe créé.');

    } catch (error) {
        console.error('❌ Erreur lors du seed :', error);
    } finally {
        await sequelize.close();
        console.log('👋 Fin du script.');
    }
}

// Lancer le script
seed();