import { getHours } from "date-fns";

export const buildTimeGreeting = (date: Date = new Date()): string => {
  const hours = getHours(date);

  if (hours >= 6 && hours <= 11) {
    return "Bom dia";
  }
  if (hours >= 12 && hours <= 17) {
    return "Boa tarde";
  }
  if (hours >= 18 && hours <= 23) {
    return "Boa noite";
  }
  return "Olá";
};

export const buildPendingTicketGreetingBody = (
  contactName?: string
): string => {
  const greeting = buildTimeGreeting();
  const hello = contactName
    ? `${greeting}, ${contactName}!`
    : `${greeting}!`;

  return `${hello}

Para agilizar seu atendimento, envie por favor:
• Nome completo do titular
• CPF ou número do contrato
• Motivo do contato

Aguarde um momento — em breve um atendente irá te responder.`;
};

export default buildTimeGreeting;
