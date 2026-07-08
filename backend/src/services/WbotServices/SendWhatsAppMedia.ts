import fs from "fs";
import AppError from "../../errors/AppError";
import getTicketBaileys from "../../helpers/getTicketBaileys";
import resolveBaileysJid from "../../helpers/resolveBaileysJid";
import Ticket from "../../models/Ticket";
import UserMessagesLog from "../../models/UserMessagesLog";
import { logger } from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  userId: number | string | undefined;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  userId
}: Request): Promise<any> => {
  try {
    const sock = await getTicketBaileys(ticket);
    const jid = resolveBaileysJid(ticket.contact, ticket);
    const buffer = fs.readFileSync(media.path);
    const mimeType = media.mimetype || "";
    let payload: Record<string, unknown>;

    if (mimeType.startsWith("image/")) {
      payload = { image: buffer, caption: media.originalname };
    } else if (mimeType.startsWith("video/")) {
      payload = { video: buffer, caption: media.originalname };
    } else if (mimeType.startsWith("audio/")) {
      payload = {
        audio: buffer,
        mimetype: media.mimetype,
        ptt: true
      };
    } else {
      payload = {
        document: buffer,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    }

    const response = await sock.sendMessage(jid, payload as any);

    await ticket.update({
      lastMessage: media.filename,
      lastMessageAt: new Date().getTime()
    });

    try {
      if (userId && response?.key?.id) {
        await UserMessagesLog.create({
          messageId: response.key.id,
          userId,
          ticketId: ticket.id
        });
      }
    } catch (error) {
      logger.error(`Error criar log mensagem ${error}`);
    }

    return {
      id: { id: response?.key?.id },
      ack: 1
    };
  } catch (err) {
    logger.error(`SendWhatsAppMedia Baileys | Error: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
