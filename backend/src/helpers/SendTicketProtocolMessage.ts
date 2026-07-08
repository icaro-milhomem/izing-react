import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";
import { buildProtocolMessageBody } from "./ticketProtocol";
import { logger } from "../utils/logger";

export const sendTicketProtocolMessage = async (
  ticket: Ticket,
  userId: number | string
): Promise<void> => {
  if (!ticket.whatsappId) return;

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp || whatsapp.status !== "CONNECTED") {
    logger.warn(
      `sendTicketProtocolMessage: WhatsApp ${ticket.whatsappId} not CONNECTED`
    );
    return;
  }

  const protocol = ticket.protocol;
  const body = buildProtocolMessageBody(protocol, ticket.contact?.name);

  await CreateMessageSystemService({
    msg: { body, fromMe: true, read: true },
    tenantId: ticket.tenantId,
    ticket,
    userId,
    sendType: "bot",
    status: "pending"
  });
};

export default sendTicketProtocolMessage;
