import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
  tenantId: string | number;
}

const UpdateSettingService = async ({
  key,
  value,
  tenantId
}: Request): Promise<Setting | undefined> => {
  if (!key) {
    throw new AppError("ERR_NO_SETTING_KEY", 400);
  }

  const settings = await Setting.findAll({
    where: { key, tenantId },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  if (!settings.length) {
    return Setting.create({ key, value, tenantId });
  }

  // Atualiza todas as linhas duplicadas da mesma chave para evitar leitura inconsistente
  await Setting.update(
    { value },
    {
      where: {
        tenantId,
        key
      }
    }
  );

  const refreshed = await Setting.findOne({
    where: { key, tenantId },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  return refreshed || settings[0];
};

export default UpdateSettingService;
