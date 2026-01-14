import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
    process.env.DB_NAME || "database_name",
    process.env.DB_USER || "username",
    process.env.DB_PASSWORD || "password",
    {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        dialect: "postgres",
        logging: false, // true pour voir les requêtes SQL
    }
);

export default sequelize;
