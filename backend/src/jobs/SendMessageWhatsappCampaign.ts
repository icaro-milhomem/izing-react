/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from "path";
import fs from "fs";
import { logger } from "../utils/logger";
import { buildBaileysJid, getBaileys } from "../libs/baileys";
import CampaignContacts from "../models/CampaignContacts";

export default {
  key: "SendMessageWhatsappCampaign",
  options: {
    delay: 15000,
    attempts: 10,
    removeOnComplete: true,
    backoff: {
      type: "fixed",
      delay: 60000 * 5
    }
  },
  async handle({ data }: any) {
    try {
      const sock = getBaileys(data.whatsappId);
      const jid = buildBaileysJid(data.number);
      let message: any;

      if (data.mediaUrl) {
        const customPath = join(__dirname, "..", "..", "public");
        const mediaPath = join(customPath, data.mediaName);
        const buffer = fs.readFileSync(mediaPath);
        message = await sock.sendMessage(jid, {
          document: buffer,
          fileName: data.mediaName,
          mimetype: "application/octet-stream",
          caption: data.message
        } as any);
      } else {
        message = await sock.sendMessage(jid, {
          text: data.message
        } as any);
      }

      await CampaignContacts.update(
        {
          messageId: message?.key?.id,
          messageRandom: data.messageRandom,
          body: data.message,
          mediaName: data.mediaName,
          timestamp: Date.now(),
          jobId: data.jobId
        },
        { where: { id: data.campaignContact.id } }
      );

      return message;
    } catch (error) {
      logger.error(`Error enviar message campaign: ${error}`);
      throw new Error(error);
    }
  }
};
