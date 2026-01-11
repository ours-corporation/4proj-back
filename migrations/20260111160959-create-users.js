'use strict';

const {DataTypes} = require("sequelize");
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quota', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        quota_bytes: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 32212254720,
        },
        price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
        },
    });

    await queryInterface.createTable('users', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        quota_id: {
            type: Sequelize.INTEGER,
            references: {
            model: 'quota',
            key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
        used_bytes: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0,
        },
        refresh_token: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
