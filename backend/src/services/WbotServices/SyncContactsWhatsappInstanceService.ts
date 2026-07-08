import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

const SyncContactsWhatsappInstanceService = async (
  whatsappId: number,
  tenantId: number
): Promise<void> => {
  logger.warn(
    `SyncContactsWhatsappInstanceService: sincronização da agenda não suportada com Baileys (session=${whatsappId}, tenant=${tenantId})`
  );
  throw new AppError("ERR_CONTACTS_NOT_EXISTS_WHATSAPP", 404);
};

export default SyncContactsWhatsappInstanceService;
