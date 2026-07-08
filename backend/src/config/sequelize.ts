import { Sequelize, Options } from "sequelize";
import dbConfig = require("./database");

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig as Options
);

export default sequelize; 