import {
  getBaileys,
  initBaileys,
  isBaileysInitializing
} from "../../libs/baileys";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import { StartInstaBotSession } from "../InstagramBotServices/StartInstaBotSession";
import { StartTbotSession } from "../TbotServices/StartTbotSession";
import { StartWaba360 } from "../WABA360/StartWaba360";
import { StartMessengerBot } from "../MessengerChannelServices/StartMessengerBot";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  try {
    const sock = getBaileys(whatsapp.id);
    if (sock.isOpen) {
      logger.info(
        `StartWhatsAppSession: ${whatsapp.id} already CONNECTED (baileys)`
      );
      return;
    }
  } catch {
    /* session not in memory */
  }

  if (isBaileysInitializing(whatsapp.id)) {
    logger.info(
      `StartWhatsAppSession: ${whatsapp.id} already initializing, skipping duplicate`
    );
    return;
  }

  const fresh = await Whatsapp.findByPk(whatsapp.id);
  if (!fresh) return;

  if (fresh.status !== "qrcode" || !fresh.qrcode) {
    await fresh.update({ status: "OPENING" });
  }

  const io = getIO();
  const updated = await Whatsapp.findByPk(whatsapp.id);
  io.emit(`${whatsapp.tenantId}:whatsappSession`, {
    action: "update",
    session: updated || fresh
  });

  try {
    if (fresh.type === "whatsapp") {
      logger.info(
        `StartWhatsAppSession: ${fresh.id} provider=baileys status=${fresh.status}`
      );
      await initBaileys(fresh);
    }

    if (fresh.type === "telegram") {
      StartTbotSession(fresh);
    }

    if (fresh.type === "instagram") {
      StartInstaBotSession(fresh);
    }

    if (fresh.type === "messenger") {
      StartMessengerBot(fresh);
    }

    if (fresh.type === "waba") {
      if (fresh.wabaBSP === "360") {
        StartWaba360(fresh);
      }
    }
  } catch (err) {
    logger.error(`StartWhatsAppSession | Error: ${err}`);
  }
};
