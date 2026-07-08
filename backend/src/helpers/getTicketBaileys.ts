import { WASocket } from "@whiskeysockets/baileys";
import { getBaileys } from "../libs/baileys";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

const getTicketBaileys = async (ticket: Ticket): Promise<WASocket> => {
  try {
    const sock = getBaileys(ticket.whatsappId);
    if ((sock as any).isOpen) {
      return sock;
    }
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  } catch (error: any) {
    if (!(error instanceof AppError) || error.message !== "ERR_WAPP_NOT_INITIALIZED") {
      throw error;
    }

    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (!whatsapp || whatsapp.status !== "CONNECTED") {
      throw error;
    }

    logger.warn(
      `Baileys session ${ticket.whatsappId} missing in memory, restarting...`
    );
    await StartWhatsAppSession(whatsapp);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sock = getBaileys(ticket.whatsappId);
    if (!(sock as any).isOpen) {
      throw new AppError("ERR_WAPP_NOT_INITIALIZED");
    }

    return sock;
  }
};

export default getTicketBaileys;
