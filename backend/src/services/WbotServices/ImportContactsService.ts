import { logger } from "../../utils/logger";

/** Importação da agenda do celular não está disponível com Baileys. */
const ImportContactsService = async (
  tenantId: string | number
): Promise<void> => {
  logger.warn(
    `ImportContactsService: não suportado com Baileys (tenant=${tenantId}). Use importação por arquivo.`
  );
};

export default ImportContactsService;
