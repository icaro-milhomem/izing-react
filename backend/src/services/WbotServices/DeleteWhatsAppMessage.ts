import AppError from "../../errors/AppError";
import getTicketBaileys from "../../helpers/getTicketBaileys";
import resolveBaileysJid from "../../helpers/resolveBaileysJid";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { getIO } from "../../libs/socket";

const DeleteWhatsAppMessage = async (
  id: string,
  messageId: string,
  tenantId: string | number
): Promise<void> => {
  if (!messageId || messageId === "null") {
    await Message.update(
      { isDeleted: true, status: "canceled" },
      { where: { id } }
    );
    const message = await Message.findByPk(id, {
      include: [
        {
          model: Ticket,
          as: "ticket",
          include: ["contact"],
          where: { tenantId }
        }
      ]
    });
    if (message) {
      const io = getIO();
      io.to(`tenant:${tenantId}:${message.ticket.id}`).emit(
        `tenant:${tenantId}:appMessage`,
        {
          action: "update",
          message,
          ticket: message.ticket,
          contact: message.ticket.contact
        }
      );
    }
    return;
  }

  const message = await Message.findOne({
    where: { messageId },
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"],
        where: { tenantId }
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const { ticket } = message;

  try {
    const sock = await getTicketBaileys(ticket);
    const jid = resolveBaileysJid(ticket.contact, ticket);
    await sock.sendMessage(jid, {
      delete: {
        remoteJid: jid,
        fromMe: true,
        id: messageId,
        participant: undefined
      }
    } as any);
  } catch (err) {
    throw new AppError("ERR_DELETE_WAPP_MSG");
  }

  await message.update({ isDeleted: true });

  const io = getIO();
  io.to(`tenant:${tenantId}:${message.ticket.id}`).emit(
    `tenant:${tenantId}:appMessage`,
    {
      action: "update",
      message,
      contact: ticket.contact
    }
  );
};

export default DeleteWhatsAppMessage;
