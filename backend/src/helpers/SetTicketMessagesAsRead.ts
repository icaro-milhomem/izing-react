import { getMessengerBot } from "../libs/messengerBot";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";
import socketEmit from "./socketEmit";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  await Message.update(
    { read: true },
    {
      where: {
        ticketId: ticket.id,
        read: false
      }
    }
  );

  await ticket.update({ unreadMessages: 0 });

  try {
    if (ticket.channel === "messenger") {
      const messengerBot = getMessengerBot(ticket.whatsappId);
      messengerBot.markSeen(ticket.contact.messengerId);
    }
  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe session disconnected? Err: ${err}`
    );
  }

  try {
    ticket.unreadMessages = 0;

    if (ticket.tenantId) {
      socketEmit({
        tenantId: ticket.tenantId,
        type: "ticket:update",
        payload: ticket
      });
    }
  } catch (err) {
    logger.warn(`Error emitting ticket read update ${ticket.id}: ${err}`);
  }
};

export default SetTicketMessagesAsRead;
