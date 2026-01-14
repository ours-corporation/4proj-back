'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('quota', [{
      name: 'Free Tier',
      quota_bytes: 32212254720,
      price: 0.00,
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('quota', { name: 'Free Tier' }, {});
  }
};
