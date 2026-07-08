import { Op } from "sequelize";
import socketEmit from "../../helpers/socketEmit";
import {
  isLikelyLid,
  isLikelyPhone
} from "../../helpers/contactJidUtils";
import Contact from "../../models/Contact";
import SendContactVCardToSelf from "../WbotServices/SendContactVCardToSelf";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  tenantId: string | number;
  pushname: string;
  isUser: boolean;
  isWAContact: boolean;
  telegramId?: string | number;
  instagramPK?: string | number;
  messengerId?: string | number;
  lid?: string;
  remoteJid?: string;
  origem?: string;
  whatsappId?: number;
  saveVCardToSelf?: boolean;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  tenantId,
  pushname,
  isUser,
  isWAContact,
  email = "",
  telegramId,
  instagramPK,
  messengerId,
  lid,
  remoteJid,
  extraInfo = [],
  origem = "whatsapp",
  whatsappId,
  saveVCardToSelf = false
}: Request): Promise<Contact> => {
  const number = isGroup
    ? String(rawNumber)
    : String(rawNumber).replace(/[^0-9]/g, "");

  const effectiveNumber =
    !isGroup && number && isLikelyLid(number) && !isLikelyPhone(number)
      ? ""
      : number;

  let contact: Contact | null = null;

  if (origem === "whatsapp") {
    if (effectiveNumber) {
      contact = await Contact.findOne({
        where: { number: effectiveNumber, tenantId }
      });
    }

    if (!contact && lid) {
      const lidUser = lid.split("@")[0];
      contact = await Contact.findOne({
        where: {
          tenantId,
          [Op.or]: [
            { lid: lidUser },
            ...(remoteJid
              ? [{ remoteJid }]
              : [{ remoteJid: `${lidUser}@lid` }]),
            { number: lidUser }
          ]
        }
      });
    }
  }

  if (origem === "telegram" && telegramId) {
    contact = await Contact.findOne({ where: { telegramId, tenantId } });
  }

  if (origem === "instagram" && instagramPK) {
    contact = await Contact.findOne({ where: { instagramPK, tenantId } });
  }

  if (origem === "messenger" && messengerId) {
    contact = await Contact.findOne({ where: { messengerId, tenantId } });
  }

  const isNewContact = !contact;

  if (contact) {
    const updateData: Record<string, unknown> = {
      pushname,
      isUser,
      isWAContact,
      telegramId,
      instagramPK,
      messengerId
    };

    if (profilePicUrl) {
      updateData.profilePicUrl = profilePicUrl;
    }
    if (lid) {
      updateData.lid = lid;
    }
    if (remoteJid) {
      updateData.remoteJid = remoteJid;
    }

    await contact.update(updateData);
    await contact.reload();
  } else {
    try {
      contact = await Contact.create({
        name,
        number: effectiveNumber,
        lid: lid || null,
        remoteJid: remoteJid || null,
        profilePicUrl: profilePicUrl || "",
        email,
        isGroup,
        pushname,
        isUser,
        isWAContact,
        tenantId,
        extraInfo,
        telegramId,
        instagramPK,
        messengerId
      });
    } catch (err: any) {
      if (err?.name !== "SequelizeUniqueConstraintError") {
        throw err;
      }
      if (origem === "whatsapp") {
        if (effectiveNumber) {
          contact = await Contact.findOne({
            where: { number: effectiveNumber, tenantId }
          });
        }
        if (!contact && lid) {
          const lidUser = lid.split("@")[0];
          contact = await Contact.findOne({
            where: {
              tenantId,
              [Op.or]: [
                { lid: lidUser },
                ...(remoteJid
                  ? [{ remoteJid }]
                  : [{ remoteJid: `${lidUser}@lid` }]),
                { number: lidUser }
              ]
            }
          });
        }
      }
      if (!contact && origem === "telegram" && telegramId) {
        contact = await Contact.findOne({ where: { telegramId, tenantId } });
      }
      if (!contact && origem === "instagram" && instagramPK) {
        contact = await Contact.findOne({ where: { instagramPK, tenantId } });
      }
      if (!contact && origem === "messenger" && messengerId) {
        contact = await Contact.findOne({ where: { messengerId, tenantId } });
      }
      if (!contact) {
        throw err;
      }
    }
  }

  if (
    isNewContact &&
    origem === "whatsapp" &&
    number &&
    !isGroup &&
    saveVCardToSelf
  ) {
    SendContactVCardToSelf(tenantId, number, whatsappId).catch(() => undefined);
  }

  socketEmit({
    tenantId,
    type: "contact:update",
    payload: contact
  });

  return contact;
};

export default CreateOrUpdateContactService;
