import { QueryInterface } from "sequelize";

/** Seed desabilitado — super não é mais criado automaticamente. */
module.exports = {
  up: (_queryInterface: QueryInterface) => Promise.resolve(),

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {});
  }
};
