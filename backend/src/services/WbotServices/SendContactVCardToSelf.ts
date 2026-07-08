import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getBaileys } from "../../libs/baileys";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

/** Envia o vCard do contato para o próprio WhatsApp conectado (chat "você"). */
const SendContactVCardToSelf = async (
  tenantId: string | number,
  number: string,
  whatsappId?: number
): Promise<void> => {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return;

  try {
    const whatsapp = whatsappId
      ? await Whatsapp.findByPk(whatsappId)
      : await GetDefaultWhatsApp(tenantId);

    if (!whatsapp || whatsapp.status !== "CONNECTED") return;

    const sock = getBaileys(whatsapp.id);
    const selfJid = sock.user?.id;
    if (!selfJid) {
      logger.warn("SendContactVCardToSelf: self jid not available");
      return;
    }

    await sock.sendMessage(selfJid, {
      contacts: {
        displayName: digits,
        contacts: [{ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${digits}\nTEL;type=CELL;type=VOICE;waid=${digits}:+${digits}\nEND:VCARD` }]
      }
    } as any);
  } catch (error) {
    logger.warn(
      `SendContactVCardToSelf tenant=${tenantId} number=${digits}: ${error}`
    );
  }
};

export default SendContactVCardToSelf;
