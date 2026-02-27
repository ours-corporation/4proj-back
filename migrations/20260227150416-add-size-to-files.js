'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('files', 'size', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('files', 'size');
  }
};