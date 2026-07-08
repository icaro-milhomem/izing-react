import {
  downloadMediaMessage,
  getContentType,
  isJidGroup,
  jidNormalizedUser,
  proto,
  WASocket
} from "@whiskeysockets/baileys";

import { logger } from "../../../utils/logger";
import ShowWhatsAppService from "../../WhatsappService/ShowWhatsAppService";
import VerifyContactBaileys from "./VerifyContactBaileys";
import FindOrCreateTicketService from "../../TicketServices/FindOrCreateTicketService";
import VerifyMessage from "./VerifyMessage";
import VerifyMediaMessage from "./VerifyMediaMessage";
import verifyBusinessHours from "./VerifyBusinessHours";
import VerifyStepsChatFlowTicket from "../../ChatFlowServices/VerifyStepsChatFlowTicket";
import Setting from "../../../models/Setting";
import Queue from "../../../libs/Queue";
import isMessageExistsService from "../../MessageServices/isMessageExistsService";
import sendPendingTicketGreeting from "../../../helpers/sendPendingTicketGreeting";
import { handleMissedCallFromMessage } from "../VerifyCallBaileys";

const unwrapMessageContent = (message: any): any => {
  let current = message;

  while (current) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }

  return current || {};
};

const extractTimestamp = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "low" in (value as any)) {
    return Number((value as any).low || 0);
  }
  return Math.floor(Date.now() / 1000);
};

const getNormalizedRemoteJid = (remoteJid?: string | null): string => {
  if (!remoteJid) return "";
  return isJidGroup(remoteJid) ? remoteJid : jidNormalizedUser(remoteJid);
};

const getMessageNode = (content: any): any => {
  const type = getContentType(content);
  if (!type) return undefined;
  return content?.[type];
};

const getContextInfo = (content: any): any => {
  const type = getContentType(content);
  if (!type) return undefined;
  if (type === "conversation") return undefined;
  return content?.[type]?.contextInfo;
};

const mapMessageType = (content: any): string => {
  const type = getContentType(content);

  switch (type) {
    case "conversation":
    case "extendedTextMessage":
    case "buttonsResponseMessage":
    case "listResponseMessage":
      return "chat";
    case "imageMessage":
      return "image";
    case "videoMessage":
      return "video";
    case "audioMessage":
      return "audio";
    case "documentMessage":
      return "document";
    case "stickerMessage":
      return "sticker";
    case "locationMessage":
      return "location";
    case "contactMessage":
      return "vcard";
    default:
      return "chat";
  }
};

const extractBody = (message: proto.IWebMessageInfo, content: any): string => {
  const type = getContentType(content);
  const node = getMessageNode(content);

  if (type === "conversation") {
    return content.conversation || "";
  }
  if (type === "extendedTextMessage") {
    return node?.text || "";
  }
  if (type === "imageMessage" || type === "videoMessage") {
    return node?.caption || "";
  }
  if (type === "documentMessage") {
    return node?.caption || (message.key?.fromMe ? "📄 Documento" : "");
  }
  if (type === "audioMessage") {
    return message.key?.fromMe ? "🎵 Áudio" : "";
  }
  if (type === "stickerMessage") {
    return message.key?.fromMe ? "🎨 Sticker" : "";
  }
  if (type === "locationMessage") {
    return "📍 Localização";
  }
  if (type === "buttonsResponseMessage") {
    return node?.selectedDisplayText || node?.selectedButtonId || "";
  }
  if (type === "listResponseMessage") {
    return node?.title || node?.singleSelectReply?.selectedRowId || "";
  }
  if (type === "contactMessage") {
    return node?.displayName || "👤 Contato";
  }

  return message.key?.fromMe ? "📷 Mídia" : "";
};

const downloadAdaptedMedia = async (
  rawMessage: proto.IWebMessageInfo,
  content: any,
  sock: WASocket
): Promise<any> => {
  const node = getMessageNode(content);
  const buffer = (await downloadMediaMessage(
    rawMessage as any,
    "buffer",
    {},
    {
      reuploadRequest: sock.updateMediaMessage
    } as any
  )) as Buffer;

  const mimetype =
    node?.mimetype ||
    (mapMessageType(content) === "audio"
      ? "audio/ogg"
      : mapMessageType(content) === "image"
        ? "image/jpeg"
        : mapMessageType(content) === "video"
          ? "video/mp4"
          : "application/octet-stream");

  return {
    data: buffer.toString("base64"),
    mimetype,
    filename: node?.fileName
  };
};

const MISSED_CALL_STUBS = new Set([40, 41, 45, 46]);

const isMissedCallMessage = (rawMessage: proto.IWebMessageInfo): boolean => {
  const stubType = Number(rawMessage.messageStubType || 0);
  if (MISSED_CALL_STUBS.has(stubType)) return true;
  return Boolean((rawMessage.message as any)?.call);
};

const isBaileysValidMessage = (rawMessage: proto.IWebMessageInfo): boolean => {
  if (isMissedCallMessage(rawMessage)) {
    return false;
  }

  if (!rawMessage.message || rawMessage.messageStubType) {
    return false;
  }

  const content = unwrapMessageContent(rawMessage.message);
  const type = getContentType(content);
  if (!type) return false;

  const ignoredTypes = new Set([
    "protocolMessage",
    "reactionMessage",
    "senderKeyDistributionMessage",
    "pollUpdateMessage",
    "encReactionMessage",
    "keepInChatMessage"
  ]);

  return !ignoredTypes.has(type);
};

const adaptBaileysMessage = (
  rawMessage: proto.IWebMessageInfo,
  sock: WASocket
): any => {
  const content = unwrapMessageContent(rawMessage.message);
  const remoteJid = getNormalizedRemoteJid(rawMessage.key?.remoteJid);
  const contextInfo = getContextInfo(content);
  const quotedMessageId = contextInfo?.stanzaId;
  const mediaType = mapMessageType(content);
  const location = getMessageNode(content);

  return {
    id: {
      id: rawMessage.key?.id,
      _serialized: `${Boolean(rawMessage.key?.fromMe)}_${remoteJid}_${rawMessage.key?.id}`
    },
    from: remoteJid,
    to: remoteJid,
    fromMe: Boolean(rawMessage.key?.fromMe),
    body: extractBody(rawMessage, content),
    timestamp: extractTimestamp(rawMessage.messageTimestamp),
    type: mediaType,
    hasMedia: ["image", "video", "audio", "document", "sticker"].includes(
      mediaType
    ),
    hasQuotedMsg: Boolean(quotedMessageId),
    location:
      mediaType === "location"
        ? {
            latitude: location?.degreesLatitude,
            longitude: location?.degreesLongitude,
            description: location?.name || location?.address
          }
        : undefined,
    getQuotedMessage: async () =>
      quotedMessageId
        ? {
            id: {
              id: quotedMessageId
            }
          }
        : null,
    downloadMedia: async () => downloadAdaptedMedia(rawMessage, content, sock)
  };
};

const HandleBaileysMessage = async (
  messages: proto.IWebMessageInfo[] | undefined,
  whatsappId: number,
  sock: WASocket
): Promise<void> => {
  try {
    const whatsapp = await ShowWhatsAppService({ id: whatsappId });
    const { tenantId } = whatsapp;

    for (const rawMessage of messages || []) {
      if (!rawMessage.key?.id || !rawMessage.key?.remoteJid) {
        continue;
      }

      if (isMissedCallMessage(rawMessage) && !rawMessage.key.fromMe) {
        await handleMissedCallFromMessage(
          whatsappId,
          getNormalizedRemoteJid(rawMessage.key.remoteJid),
          (rawMessage.key as { remoteJidAlt?: string }).remoteJidAlt,
          rawMessage.key.id
        );
        continue;
      }

      if (!isBaileysValidMessage(rawMessage)) {
        continue;
      }

      const remoteJid = getNormalizedRemoteJid(rawMessage.key.remoteJid);
      if (!remoteJid || remoteJid === "status@broadcast") continue;

      const isGroup = isJidGroup(remoteJid);
      const setting = await Setting.findOne({
        where: { key: "ignoreGroupMsg", tenantId }
      });

      if (setting?.value === "enabled" && isGroup) continue;

      const adaptedMsg = adaptBaileysMessage(rawMessage, sock);
      if (!adaptedMsg.id?.id || !adaptedMsg.body && !adaptedMsg.hasMedia) continue;

      if (await isMessageExistsService(adaptedMsg)) continue;

      const number = remoteJid.split("@")[0];
      const pushName =
        rawMessage.pushName ||
        rawMessage.verifiedBizName ||
        number;

      const contact = await VerifyContactBaileys(
        remoteJid,
        (rawMessage.key as { remoteJidAlt?: string }).remoteJidAlt,
        pushName,
        tenantId,
        Boolean(isGroup)
      );

      const ticket = await FindOrCreateTicketService({
        contact,
        whatsappId: whatsapp.id,
        unreadMessages: adaptedMsg.fromMe ? 0 : 1,
        tenantId,
        msg: adaptedMsg,
        channel: "whatsapp"
      });

      if (ticket?.isCampaignMessage || ticket?.isFarewellMessage) {
        continue;
      }

      if (adaptedMsg.hasMedia) {
        await VerifyMediaMessage(adaptedMsg, ticket, contact);
      } else {
        await VerifyMessage(adaptedMsg, ticket, contact);
      }

      if (!adaptedMsg.fromMe) {
        await sendPendingTicketGreeting(ticket);
      }

      const isBusinessHours = await verifyBusinessHours(adaptedMsg, ticket);
      if (isBusinessHours) {
        await VerifyStepsChatFlowTicket(adaptedMsg, ticket);
      }

      const apiConfig: any = ticket.apiConfig || {};
      if (
        !adaptedMsg.fromMe &&
        !ticket.isGroup &&
        !ticket.answered &&
        apiConfig?.externalKey &&
        apiConfig?.urlMessageStatus
      ) {
        const payload = {
          timestamp: Date.now(),
          msg: adaptedMsg,
          messageId: adaptedMsg.id.id,
          ticketId: ticket.id,
          externalKey: apiConfig.externalKey,
          authToken: apiConfig.authToken,
          type: "hookMessage"
        };
        Queue.add("WebHooksAPI", {
          url: apiConfig.urlMessageStatus,
          type: payload.type,
          payload
        });
      }
    }
  } catch (error) {
    logger.error(`HandleBaileysMessage error session=${whatsappId}: ${error}`);
  }
};

export default HandleBaileysMessage;
