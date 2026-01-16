'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Ajout sur la table FOLDERS
    await queryInterface.addColumn('folders', 'deletion_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "UUID commun pour grouper les suppressions en lot"
    });

    // Ajout sur la table FILES
    await queryInterface.addColumn('files', 'deletion_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      comment: "UUID commun pour grouper les suppressions en lot"
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('folders', 'deletion_id');
    await queryInterface.removeColumn('files', 'deletion_id');
  }
};