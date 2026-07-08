import {
  isJidGroup,
  isLidUser,
  jidNormalizedUser
} from "@whiskeysockets/baileys";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import AppError from "../errors/AppError";
import { buildBaileysJid } from "../libs/baileys";
import { isLikelyLid, isLikelyPhone } from "./contactJidUtils";

const digitsOnly = (value: string): string =>
  String(value || "").replace(/\D/g, "");

const buildLidJid = (lid: string): string =>
  lid.includes("@") ? jidNormalizedUser(lid) : `${lid}@lid`;

export const resolveBaileysJid = (
  contact: Contact,
  ticket?: Ticket
): string => {
  const isGroup = Boolean(ticket?.isGroup || contact.isGroup);

  if (isGroup && contact.number) {
    return `${digitsOnly(contact.number)}@g.us`;
  }

  const ext = contact as Contact & { remoteJid?: string; lid?: string };

  if (ext.remoteJid) {
    if (isJidGroup(ext.remoteJid)) {
      return ext.remoteJid;
    }
    return jidNormalizedUser(ext.remoteJid);
  }

  if (ext.lid && isLikelyLid(ext.lid)) {
    return buildLidJid(ext.lid);
  }

  if (contact.number && isLikelyLid(contact.number)) {
    return buildLidJid(contact.number);
  }

  if (contact.number && isLikelyPhone(contact.number)) {
    return buildBaileysJid(contact.number);
  }

  if (contact.number) {
    return buildBaileysJid(contact.number);
  }

  throw new AppError("ERR_WAPP_INVALID_CONTACT_JID");
};

export default resolveBaileysJid;
