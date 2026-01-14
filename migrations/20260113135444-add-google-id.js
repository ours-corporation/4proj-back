'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'google_id', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
    });


    await queryInterface.changeColumn('users', 'password', {
        type: Sequelize.STRING,
        allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'google_id');

    await queryInterface.changeColumn('users', 'password', {
        type: Sequelize.STRING,
        allowNull: false,
    });
  }
};
