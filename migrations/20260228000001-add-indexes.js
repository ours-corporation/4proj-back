'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addIndex('files', ['user_id']);
        await queryInterface.addIndex('files', ['folder_id']);
        await queryInterface.addIndex('files', ['trashed_at']);
        await queryInterface.addIndex('folders', ['user_id']);
        await queryInterface.addIndex('folders', ['parent_id']);
        await queryInterface.addIndex('folders', ['trashed_at']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('files', ['user_id']);
        await queryInterface.removeIndex('files', ['folder_id']);
        await queryInterface.removeIndex('files', ['trashed_at']);
        await queryInterface.removeIndex('folders', ['user_id']);
        await queryInterface.removeIndex('folders', ['parent_id']);
        await queryInterface.removeIndex('folders', ['trashed_at']);
    }
};
