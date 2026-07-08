import { QueryInterface } from "sequelize";

/** Seed desabilitado — empresa criada em /auth/setup (primeiro acesso). */
module.exports = {
  up: (_queryInterface: QueryInterface) => Promise.resolve(),

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Tenants", {});
  }
};
