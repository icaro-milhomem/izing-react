import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";
import { buildPendingTicketGreetingBody } from "./buildTimeGreeting";
import canSendAutoAttendanceMessage from "./canSendAutoAttendanceMessage";
import { logger } from "../utils/logger";

const greetedTicketIds = new Set<number>();

export const shouldSendPendingTicketGreeting = (ticket: Ticket): boolean => {
  if (!ticket?.isCreated) return false;
  if (ticket.isGroup) return false;
  if (ticket.userId) return false;
  if (ticket.chatFlowId) return false;
  if (ticket.status !== "pending") return false;
  if (process.env.PENDING_TICKET_GREETING_ENABLED === "false") {
    return false;
  }
  return true;
};

export const sendPendingTicketGreeting = async (
  ticket: Ticket
): Promise<void> => {
  if (!shouldSendPendingTicketGreeting(ticket)) return;

  if (greetedTicketIds.has(ticket.id)) return;
  greetedTicketIds.add(ticket.id);

  if (!(await canSendAutoAttendanceMessage(ticket))) return;

  if (!ticket.whatsappId) return;

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp || whatsapp.status !== "CONNECTED") {
    logger.warn(
      `sendPendingTicketGreeting: WhatsApp ${ticket.whatsappId} not CONNECTED`
    );
    return;
  }

  const customMessage = process.env.PENDING_TICKET_GREETING_MESSAGE?.trim();
  const body =
    customMessage ||
    buildPendingTicketGreetingBody(ticket.contact?.name);

  try {
    await CreateMessageSystemService({
      msg: {
        body,
        fromMe: true,
        read: true
      },
      tenantId: ticket.tenantId,
      ticket,
      sendType: "bot",
      status: "pending"
    });
  } catch (error) {
    logger.warn(
      `sendPendingTicketGreeting ticket=${ticket.id}: ${error}`
    );
  }
};

export default sendPendingTicketGreeting;
