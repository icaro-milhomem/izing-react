import { QueryInterface } from "sequelize";

/** Seed desabilitado — settings criadas junto com a empresa em /auth/setup. */
module.exports = {
  up: (_queryInterface: QueryInterface) => Promise.resolve(),

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Settings", {});
  }
};
