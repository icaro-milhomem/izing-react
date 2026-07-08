import {
  isJidGroup,
  isLidUser,
  jidNormalizedUser
} from "@whiskeysockets/baileys";
import Contact from "../../../models/Contact";
import CreateOrUpdateContactService from "../../ContactServices/CreateOrUpdateContactService";
import { isLikelyLid, isLikelyPhone } from "../../../helpers/contactJidUtils";

const digitsOnly = (value: string): string =>
  String(value || "").replace(/\D/g, "");

const normalizeJid = (jid?: string | null): string => {
  if (!jid) return "";
  if (isJidGroup(jid)) return jid;
  return jidNormalizedUser(jid);
};

const extractPhoneFromJid = (jid?: string | null): string => {
  const normalized = normalizeJid(jid);
  if (!normalized || isJidGroup(normalized) || isLidUser(normalized)) {
    return "";
  }

  const user = normalized.split("@")[0];
  return isLikelyPhone(user) ? digitsOnly(user) : "";
};

const VerifyContactBaileys = async (
  remoteJid: string,
  remoteJidAlt: string | undefined,
  name: string,
  tenantId: string | number,
  isGroup: boolean
): Promise<Contact> => {
  const normalizedJid = normalizeJid(remoteJid);
  const normalizedAlt = normalizeJid(remoteJidAlt);
  const jidUser = normalizedJid.split("@")[0];

  let number = "";
  let lid: string | undefined;

  if (isGroup) {
    number = jidUser;
  } else if (isLidUser(normalizedJid)) {
    lid = jidUser;
    number = extractPhoneFromJid(normalizedAlt);
  } else {
    number = extractPhoneFromJid(normalizedJid);
  }

  const contactData = {
    name: name || number || jidUser,
    number,
    lid,
    remoteJid: normalizedJid,
    profilePicUrl: undefined,
    tenantId,
    pushname: name,
    isUser: true,
    isWAContact: true,
    isGroup
  };

  return CreateOrUpdateContactService(contactData);
};

export default VerifyContactBaileys;
