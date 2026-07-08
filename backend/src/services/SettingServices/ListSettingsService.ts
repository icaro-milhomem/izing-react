import Setting from "../../models/Setting";

const ListSettingsService = async (
  tenantId: number | string
): Promise<Setting[] | undefined> => {
  const settings = await Setting.findAll({
    where: { tenantId },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  const latestByKey = new Map<string, Setting>();
  for (const setting of settings) {
    if (!latestByKey.has(setting.key)) {
      latestByKey.set(setting.key, setting);
    }
  }

  return Array.from(latestByKey.values());
};

export default ListSettingsService;
