import Whatsapp from "../../models/Whatsapp";

const LIST_ATTRIBUTES = [
  "id",
  "name",
  "type",
  "status",
  "qrcode",
  "number",
  "logo",
  "wavoip",
  "queueId",
  "chatFlowId",
  "isDefault",
  "isActive",
  "isDeleted",
  "updatedAt",
  "battery",
  "plugged",
  "farewellMessage",
  "tenantId",
  "wabaBSP",
  "tokenTelegram",
  "instagramUser",
  "fbPageId",
  "retries",
  "createdAt"
];

const ListWhatsAppsService = async (
  tenantId: string | number
): Promise<Whatsapp[]> => {
  const whatsapps = await Whatsapp.findAll({
    where: { tenantId },
    attributes: LIST_ATTRIBUTES,
    order: [["name", "ASC"]]
  });

  return whatsapps;
};

export default ListWhatsAppsService;
