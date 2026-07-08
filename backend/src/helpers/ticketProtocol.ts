import { format } from "date-fns";

export const buildTicketProtocol = (
  createdAt: Date | string,
  ticketId: number | string
): string => {
  const formatDate = format(new Date(createdAt), "yyyyddMMHHmmss");
  return `${formatDate}${ticketId}`;
};

export const buildProtocolMessageBody = (
  protocol: string,
  contactName?: string
): string => {
  const hello = contactName ? `Olá, ${contactName}!` : "Olá!";
  return `${hello}\n\n*Protocolo de atendimento:* ${protocol}\n\nGuarde este número para consultas sobre este atendimento.`;
};

export default buildTicketProtocol;
