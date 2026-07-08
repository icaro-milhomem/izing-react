import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import persistContactProfilePic from "../../helpers/persistContactProfilePic";
import { getBaileys } from "../../libs/baileys";
import resolveBaileysJid from "../../helpers/resolveBaileysJid";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";

const ResolveContactProfilePicUrl = async (
  tenantId: string | number,
  number: string,
  serializedJid?: string,
  whatsappId?: number
): Promise<string | undefined> => {
  try {
    const whatsapp = whatsappId
      ? { id: whatsappId }
      : await GetDefaultWhatsApp(tenantId);
    const sock = getBaileys(whatsapp.id);
    const contact = { number, lid: serializedJid } as Contact;
    const jid = resolveBaileysJid(contact);

    const remoteUrl = await sock.profilePictureUrl(jid, "image");
    if (!remoteUrl) return undefined;

    return persistContactProfilePic(tenantId, number, remoteUrl);
  } catch (error) {
    logger.warn(
      `ResolveContactProfilePicUrl tenant=${tenantId} number=${number}: ${error}`
    );
  }

  return undefined;
};

export default ResolveContactProfilePicUrl;
