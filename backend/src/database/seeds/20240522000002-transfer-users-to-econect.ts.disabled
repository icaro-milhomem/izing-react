import { QueryInterface } from "sequelize";

interface TenantResult {
  id: number;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Primeiro, criar o tenant da econect
    await queryInterface.sequelize.query(`
      INSERT INTO public."Tenants"(
        status, 
        "ownerId", 
        "createdAt", 
        "updatedAt", 
        name, 
        "businessHours", 
        "messageBusinessHours", 
        "maxUsers", 
        "maxConnections"
      ) VALUES (
        'active', 
        NULL, 
        NOW(), 
        NOW(), 
        'Econect', 
        '[{"day": 0, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Domingo"}, 
          {"day": 1, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Segunda-Feira"}, 
          {"day": 2, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Terça-Feira"}, 
          {"day": 3, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Quarta-Feira"}, 
          {"day": 4, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Quinta-Feira"}, 
          {"day": 5, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Sexta-Feira"}, 
          {"day": 6, "hr1": "08:00", "hr2": "12:00", "hr3": "14:00", "hr4": "18:00", "type": "O", "label": "Sábado"}]',
        'Olá! Fantástico receber seu contato! No momento estamos ausentes e não poderemos lhe atender, mas vamos priorizar seu atendimento e retornaremos logo mais. Agradecemos muito o contato.',
        '99',
        '99'
      ) RETURNING id;
    `);

    // Pegar o ID do novo tenant
    const [newTenant] = await queryInterface.sequelize.query(
      `SELECT id FROM public."Tenants" WHERE name = 'Econect' ORDER BY id DESC LIMIT 1;`
    ) as any[];

    if (!newTenant || !newTenant[0]) {
      throw new Error('Tenant não encontrado');
    }
    const newTenantId = newTenant[0].id;

    // Transferir os usuários
    await queryInterface.sequelize.query(`
      UPDATE public."Users"
      SET "tenantId" = ${newTenantId}
      WHERE "tenantId" = 1;
    `);

    // Transferir as filas
    await queryInterface.sequelize.query(`
      UPDATE public."Queues"
      SET "tenantId" = ${newTenantId}
      WHERE "tenantId" = 1;
    `);

    // Transferir os contatos
    await queryInterface.sequelize.query(`
      UPDATE public."Contacts"
      SET "tenantId" = ${newTenantId}
      WHERE "tenantId" = 1;
    `);

    // Transferir os tickets
    await queryInterface.sequelize.query(`
      UPDATE public."Tickets"
      SET "tenantId" = ${newTenantId}
      WHERE "tenantId" = 1;
    `);

    // Transferir as mensagens
    await queryInterface.sequelize.query(`
      UPDATE public."Messages"
      SET "tenantId" = ${newTenantId}
      WHERE "tenantId" = 1;
    `);

    // Transferir as configurações
    await queryInterface.sequelize.query(`
      UPDATE public."Settings"
      SET "tenantId" = ${newTenantId}
      WHERE "tenantId" = 1;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Pegar o ID do tenant da econect
    const [econectTenant] = await queryInterface.sequelize.query(
      `SELECT id FROM public."Tenants" WHERE name = 'Econect' ORDER BY id DESC LIMIT 1;`
    ) as any[];

    if (!econectTenant || !econectTenant[0]) {
      throw new Error('Tenant não encontrado');
    }
    const econectTenantId = econectTenant[0].id;

    // Reverter as transferências
    await queryInterface.sequelize.query(`
      UPDATE public."Users"
      SET "tenantId" = 1
      WHERE "tenantId" = ${econectTenantId};
    `);

    await queryInterface.sequelize.query(`
      UPDATE public."Queues"
      SET "tenantId" = 1
      WHERE "tenantId" = ${econectTenantId};
    `);

    await queryInterface.sequelize.query(`
      UPDATE public."Contacts"
      SET "tenantId" = 1
      WHERE "tenantId" = ${econectTenantId};
    `);

    await queryInterface.sequelize.query(`
      UPDATE public."Tickets"
      SET "tenantId" = 1
      WHERE "tenantId" = ${econectTenantId};
    `);

    await queryInterface.sequelize.query(`
      UPDATE public."Messages"
      SET "tenantId" = 1
      WHERE "tenantId" = ${econectTenantId};
    `);

    await queryInterface.sequelize.query(`
      UPDATE public."Settings"
      SET "tenantId" = 1
      WHERE "tenantId" = ${econectTenantId};
    `);

    // Remover o tenant da econect
    await queryInterface.sequelize.query(`
      DELETE FROM public."Tenants"
      WHERE id = ${econectTenantId};
    `);
  }
}; 