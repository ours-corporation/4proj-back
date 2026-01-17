'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shares', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si le proprio est supprimé, ses partages sautent
      },
      file_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si le fichier est supprimé, le partage saute
      },
      folder_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'folders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si le dossier est supprimé, le partage saute
      },
      recipient_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si l'invité est supprimé, son accès saute
      },
      token: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true // Le token sert d'identifiant unique dans l'URL
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: true // Optionnel
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true // Optionnel
      },
      permission: {
        type: Sequelize.ENUM('READ', 'WRITE'),
        allowNull: false,
        defaultValue: 'READ'
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

    // Ajout d'une contrainte pour éviter les doublons de partage
    await queryInterface.addIndex('shares', ['file_id', 'recipient_id'], {
      unique: true,
      where: {
        file_id: { [Sequelize.Op.ne]: null },
        recipient_id: { [Sequelize.Op.ne]: null }
      },
      name: 'unique_share_file_recipient'
    });

    await queryInterface.addIndex('shares', ['folder_id', 'recipient_id'], {
      unique: true,
      where: {
        folder_id: { [Sequelize.Op.ne]: null },
        recipient_id: { [Sequelize.Op.ne]: null }
      },
      name: 'unique_share_folder_recipient'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('shares');
  }
};