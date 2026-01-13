'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      folder_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // null signifie que le fichier est à la racine
        references: {
          model: 'folders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false // Nom d'affichage pour l'utilisateur
      },
      physical_key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // L'UUID stocké sur le disque /app/uploads/u1/uuid
      },
      size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: false // Utilisé pour le calcul du quota de 30 Go [cite: 12]
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: true // Pour la prévisualisation PDF/Images [cite: 29, 31, 117]
      },
      trashed_at: {
        type: Sequelize.DATE,
        allowNull: true // Pour la gestion de la corbeille 
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true // Soft-delete optionnel
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('files');
  }
};