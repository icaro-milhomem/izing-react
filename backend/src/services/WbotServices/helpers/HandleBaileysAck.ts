import type { proto } from "@whiskeysockets/baileys";

import HandleMsgAck from "./HandleMsgAck";
import { logger } from "../../../utils/logger";

type MessageUpdate = {
  key?: proto.IMessageKey;
  update?: {
    status?: number | string | null;
  };
};

const mapBaileysAck = (status?: number | string | null): number | null => {
  if (typeof status === "number") {
    return Math.max(0, Math.min(4, status));
  }

  const normalized = String(status || "").toUpperCase();
  if (!normalized) return null;
  if (normalized.includes("PLAY")) return 4;
  if (normalized.includes("READ")) return 3;
  if (normalized.includes("DELIVER")) return 2;
  if (normalized.includes("SERVER") || normalized.includes("SENT")) return 1;
  return null;
};

const HandleBaileysAck = async (
  updates: MessageUpdate[] | undefined
): Promise<void> => {
  try {
    for (const item of updates || []) {
      const messageId = item.key?.id;
      const remoteJid = item.key?.remoteJid;
      const fromMe = Boolean(item.key?.fromMe);
      const ack = mapBaileysAck(item.update?.status);

      if (!messageId || ack == null) continue;

      await HandleMsgAck(
        {
          id: {
            id: messageId,
            _serialized: `${fromMe}_${remoteJid || ""}_${messageId}`
          },
          from: remoteJid,
          fromMe
        } as any,
        ack as any
      );
    }
  } catch (error) {
    logger.error(`HandleBaileysAck error: ${error}`);
  }
};

export default HandleBaileysAck;
