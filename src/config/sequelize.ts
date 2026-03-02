import { Sequelize } from "sequelize-typescript";
import { Folder, Quota, User, File, Share } from "../models";

const sequelize = new Sequelize(
    process.env.DB_NAME || "database_name",
    process.env.DB_USER || "username",
    process.env.DB_PASSWORD || "password",
    {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        dialect: "postgres",
        logging: false,
        models: [User, Quota, Folder, File, Share],
    }
);

export default sequelize;
