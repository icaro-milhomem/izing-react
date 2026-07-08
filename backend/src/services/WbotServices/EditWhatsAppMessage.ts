import AppError from "../../errors/AppError";
import getTicketBaileys from "../../helpers/getTicketBaileys";
import resolveBaileysJid from "../../helpers/resolveBaileysJid";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

const EditWhatsAppMessage = async (
  id: string,
  messageId: string,
  tenantId: string | number,
  newBody: string
): Promise<void> => {
  if (!id || id === "null") {
    throw new AppError("ERR_NO_MESSAGE_ID_PROVIDED");
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

  const messageAgeInMinutes =
    (new Date().getTime() - new Date(message.createdAt).getTime()) / 60000;

  if (messageAgeInMinutes > 15) {
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

  const editedValue = message.edited;
  const isEdited =
    editedValue &&
    typeof editedValue === "string" &&
    editedValue.trim() !== "" &&
    editedValue.toLowerCase() !== "false";

  if (isEdited) {
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

  const { ticket } = message;
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  if (!whatsapp || whatsapp.status !== "CONNECTED") {
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

  if (!message.fromMe) {
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

  try {
    const sock = await getTicketBaileys(ticket);
    const jid = resolveBaileysJid(ticket.contact, ticket);

    await sock.sendMessage(jid, {
      text: newBody,
      edit: {
        remoteJid: jid,
        fromMe: true,
        id: messageId,
        participant: undefined
      }
    } as any);

    const originalBody = message.body;
    await message.update({
      body: newBody,
      edited: originalBody
    });

    logger.info(`Mensagem editada com sucesso (Baileys): ${messageId}`);
  } catch (err: any) {
    logger.error(`Erro ao editar mensagem no WhatsApp: ${err?.message || err}`);
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

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

export default EditWhatsAppMessage;
