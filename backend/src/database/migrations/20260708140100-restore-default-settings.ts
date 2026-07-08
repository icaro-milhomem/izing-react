import { QueryInterface, QueryTypes } from "sequelize";

const defaultSettings = [
  { key: "userCreation", value: "disabled" },
  { key: "NotViewTicketsQueueUndefined", value: "disabled" },
  { key: "NotViewTicketsChatBot", value: "disabled" },
  { key: "DirectTicketsToWallets", value: "disabled" },
  { key: "NotViewAssignedTickets", value: "disabled" },
  { key: "botTicketActive", value: "3" },
  { key: "ignoreGroupMsg", value: "enabled" },
  { key: "rejectCalls", value: "disabled" },
  { key: "hubToken", value: "disabled" },
  {
    key: "callRejectMessage",
    value:
      "As chamadas de voz e vídeo estão desabilitas para esse WhatsApp, favor enviar uma mensagem de texto."
  },
  { key: "autoMessageCooldownHours", value: "24" },
  { key: "newTicketTransference", value: "disabled" }
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tenants = (await queryInterface.sequelize.query(
      'SELECT id FROM "Tenants"',
      { type: QueryTypes.SELECT }
    )) as Array<{ id: number }>;

    const now = new Date();

    for (const tenant of tenants) {
      for (const setting of defaultSettings) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO "Settings" (key, value, "tenantId", "createdAt", "updatedAt")
          SELECT :key, :value, :tenantId, :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM "Settings"
            WHERE key = :key AND "tenantId" = :tenantId
          );
          `,
          {
            replacements: {
              key: setting.key,
              value: setting.value,
              tenantId: tenant.id,
              now
            }
          }
        );
      }
    }
  },

  down: async () => {
    // Restauração de dados — sem rollback automático.
  }
};
