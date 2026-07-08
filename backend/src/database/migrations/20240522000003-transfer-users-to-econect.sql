-- Criar o tenant da econect
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

-- Pegar o ID do novo tenant
DO $$
DECLARE
  new_tenant_id INTEGER;
BEGIN
  SELECT id INTO new_tenant_id FROM public."Tenants" WHERE name = 'Econect' ORDER BY id DESC LIMIT 1;

  -- Transferir os usuários
  UPDATE public."Users"
  SET "tenantId" = new_tenant_id
  WHERE "tenantId" = 1;

  -- Transferir as filas
  UPDATE public."Queues"
  SET "tenantId" = new_tenant_id
  WHERE "tenantId" = 1;

  -- Transferir os contatos
  UPDATE public."Contacts"
  SET "tenantId" = new_tenant_id
  WHERE "tenantId" = 1;

  -- Transferir os tickets
  UPDATE public."Tickets"
  SET "tenantId" = new_tenant_id
  WHERE "tenantId" = 1;

  -- Transferir as mensagens
  UPDATE public."Messages"
  SET "tenantId" = new_tenant_id
  WHERE "tenantId" = 1;

  -- Transferir as configurações
  UPDATE public."Settings"
  SET "tenantId" = new_tenant_id
  WHERE "tenantId" = 1;
END $$; 