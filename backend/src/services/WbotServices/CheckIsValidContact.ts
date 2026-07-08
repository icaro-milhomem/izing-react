import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { buildBaileysJid, getBaileys } from "../../libs/baileys";
import { logger } from "../../utils/logger";

const CheckIsValidContact = async (
  number: string,
  tenantId: string | number
): Promise<{ user: string }> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(tenantId);
  const digits = String(number || "").replace(/\D/g, "");

  if (!digits) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  try {
    const sock = getBaileys(defaultWhatsapp.id);
    const jid = buildBaileysJid(digits);
    const result = await sock.onWhatsApp(jid);
    const exists = result?.[0]?.exists;

    if (!exists) {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }

    return { user: digits };
  } catch (err: any) {
    logger.error(`CheckIsValidContact | Error: ${err}`);
    if (err instanceof AppError) throw err;
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
