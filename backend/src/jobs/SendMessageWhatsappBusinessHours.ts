/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBaileys } from "../libs/baileys";
import resolveBaileysJid from "../helpers/resolveBaileysJid";
import { logger } from "../utils/logger";

export default {
  key: "SendMessageWhatsappBusinessHours",
  options: {
    delay: 60000,
    attempts: 10,
    backoff: {
      type: "fixed",
      delay: 60000 * 5
    }
  },
  async handle({ data }: any) {
    try {
      const sock = getBaileys(data.ticket.whatsappId);
      const jid = resolveBaileysJid(data.ticket.contact, data.ticket);
      const message = await sock.sendMessage(jid, {
        text: data.tenant.messageBusinessHours
      } as any);

      return {
        message,
        messageBusinessHours: data.tenant.messageBusinessHours,
        ticket: data.ticket
      };
    } catch (error) {
      logger.error(`Error enviar message business hours: ${error}`);
      throw new Error(error);
    }
  }
};
