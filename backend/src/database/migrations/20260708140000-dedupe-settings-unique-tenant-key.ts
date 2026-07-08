import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Mantém a linha mais recente por (tenantId, key); remove duplicatas antigas.
    await queryInterface.sequelize.query(`
      DELETE FROM "Settings" s
      USING (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY "tenantId", "key"
            ORDER BY "updatedAt" DESC NULLS LAST, id DESC
          ) AS rn
        FROM "Settings"
      ) d
      WHERE s.id = d.id AND d.rn > 1;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Settings_tenantId_key"
      ON "Settings" ("tenantId", "key");
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "Settings_tenantId_key";
    `);
  }
};
