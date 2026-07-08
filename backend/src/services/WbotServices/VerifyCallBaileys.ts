import {
  isLidUser,
  jidNormalizedUser,
  WACallEvent,
  WASocket
} from "@whiskeysockets/baileys";
import { Op } from "sequelize";
import Setting from "../../models/Setting";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageSystemService from "../MessageServices/CreateMessageSystemService";
import VerifyContactBaileys from "./helpers/VerifyContactBaileys";

const DEFAULT_REJECT_MESSAGE =
  "As chamadas de voz e vídeo estão desabilitadas para esse WhatsApp, favor enviar uma mensagem de texto.";

const processedCallIds = new Set<string>();

const rememberCall = (callId: string): boolean => {
  if (!callId) return false;
  if (processedCallIds.has(callId)) return false;
  processedCallIds.add(callId);
  if (processedCallIds.size > 500) {
    const first = processedCallIds.values().next().value;
    if (first) processedCallIds.delete(first);
  }
  return true;
};

const loadRejectSettings = async (
  tenantId: number | string
): Promise<{ enabled: boolean; message: string }> => {
  const settings = await Setting.findAll({
    where: {
      tenantId,
      key: { [Op.in]: ["rejectCalls", "callRejectMessage"] }
    },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  const latestByKey = new Map<string, string>();
  for (const setting of settings) {
    if (!latestByKey.has(setting.key)) {
      latestByKey.set(setting.key, setting.value);
    }
  }

  return {
    enabled: latestByKey.get("rejectCalls") === "enabled",
    message: latestByKey.get("callRejectMessage") || DEFAULT_REJECT_MESSAGE
  };
};

const uniqueJids = (...values: Array<string | undefined | null>): string[] => {
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalized = value.includes("@")
      ? jidNormalizedUser(value)
      : value;
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  }
  return result;
};

const rejectWithFallbacks = async (
  sock: WASocket,
  callId: string,
  candidates: string[]
): Promise<string | null> => {
  let lastError: unknown;

  for (const jid of candidates) {
    try {
      await sock.rejectCall(callId, jid);
      return jid;
    } catch (error) {
      lastError = error;
      logger.warn(
        `VerifyCallBaileys rejectCall failed callId=${callId} jid=${jid}: ${error}`
      );
    }
  }

  if (lastError) throw lastError;
  return null;
};

const sendCallRejectMessage = async ({
  whatsapp,
  remoteJid,
  remoteJidAlt,
  message
}: {
  whatsapp: Whatsapp;
  remoteJid: string;
  remoteJidAlt?: string;
  message: string;
}): Promise<void> => {
  const contact = await VerifyContactBaileys(
    remoteJid,
    remoteJidAlt,
    remoteJidAlt?.split("@")[0] || remoteJid.split("@")[0],
    whatsapp.tenantId,
    false
  );

  const ticket = await FindOrCreateTicketService({
    contact,
    whatsappId: whatsapp.id,
    unreadMessages: 1,
    tenantId: whatsapp.tenantId,
    channel: "whatsapp"
  });

  if (!ticket?.id || ticket?.isCampaignMessage || ticket?.isFarewellMessage) {
    return;
  }

  await CreateMessageSystemService({
    msg: {
      body: message,
      fromMe: true,
      read: true,
      sendType: "bot"
    },
    tenantId: ticket.tenantId,
    ticket,
    sendType: "call",
    status: "pending"
  });
};

export const handleMissedCallFromMessage = async (
  whatsappId: number,
  remoteJid: string,
  remoteJidAlt: string | undefined,
  callId: string
): Promise<void> => {
  try {
    // mesma chave da oferta: se já rejeitamos em tempo real, não reenvia
    if (!rememberCall(callId)) return;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) return;

    const { enabled, message } = await loadRejectSettings(whatsapp.tenantId);
    if (!enabled) return;

    logger.info(
      `VerifyCallBaileys missed-call fallback session=${whatsappId} callId=${callId} from=${remoteJid}`
    );

    await sendCallRejectMessage({
      whatsapp,
      remoteJid,
      remoteJidAlt,
      message
    });
  } catch (error) {
    logger.error(
      `VerifyCallBaileys missed-call fallback error session=${whatsappId}: ${error}`
    );
  }
};

const VerifyCallBaileys = async (
  calls: WACallEvent[] | undefined,
  whatsappId: number,
  sock: WASocket
): Promise<void> => {
  try {
    logger.info(
      `VerifyCallBaileys event session=${whatsappId} count=${(calls || []).length} statuses=${(calls || [])
        .map(c => c.status)
        .join(",")}`
    );

    const actionable = (calls || []).filter(call =>
      ["offer", "ringing"].includes(call.status)
    );
    if (!actionable.length) return;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) return;

    const { enabled, message } = await loadRejectSettings(whatsapp.tenantId);
    if (!enabled) {
      logger.info(
        `VerifyCallBaileys ignored session=${whatsappId} rejectCalls disabled`
      );
      return;
    }

    for (const call of actionable) {
      try {
        if (call.isGroup) continue;
        if (!call.id) continue;
        if (!rememberCall(call.id)) continue;

        const candidates = uniqueJids(
          call.from,
          call.chatId,
          call.callerPn,
          call.groupJid
        ).filter(jid => !jid.endsWith("@g.us"));

        if (!candidates.length) {
          logger.warn(
            `VerifyCallBaileys no jid session=${whatsappId} callId=${call.id}`
          );
          continue;
        }

        logger.info(
          `VerifyCallBaileys reject session=${whatsappId} callId=${call.id} candidates=${candidates.join(
            "|"
          )} status=${call.status}`
        );

        const rejectedJid = await rejectWithFallbacks(
          sock,
          call.id,
          candidates
        );

        const remoteJid = call.chatId || call.from || rejectedJid || candidates[0];
        const remoteJidAlt =
          call.callerPn ||
          candidates.find(jid => !isLidUser(jid)) ||
          undefined;

        await sendCallRejectMessage({
          whatsapp,
          remoteJid,
          remoteJidAlt,
          message
        });
      } catch (error) {
        logger.error(
          `VerifyCallBaileys offer error session=${whatsappId}: ${error}`
        );
      }
    }
  } catch (error) {
    logger.error(`VerifyCallBaileys error session=${whatsappId}: ${error}`);
  }
};

export default VerifyCallBaileys;
