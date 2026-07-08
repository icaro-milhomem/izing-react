import { QueryInterface } from "sequelize";

/** Seed desabilitado — admin criado em /auth/setup (primeiro acesso). */
module.exports = {
  up: (_queryInterface: QueryInterface) => Promise.resolve(),

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {});
  }
};
