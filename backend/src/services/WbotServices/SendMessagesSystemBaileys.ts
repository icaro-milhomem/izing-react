/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from "fs";
import { join } from "path";
import mime from "mime-types";
import { Op } from "sequelize";

import { getBaileys } from "../../libs/baileys";
import resolveBaileysJid from "../../helpers/resolveBaileysJid";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import { sleepRandomTime } from "../../utils/sleepRandomTime";

const SendMessagesSystemBaileys = async (
  sessionId: number,
  tenantId: number | string
): Promise<void> => {
  const sock = getBaileys(sessionId);
  if (!sock.isOpen) return;

  const where = {
    fromMe: true,
    messageId: { [Op.is]: null },
    status: "pending",
    [Op.or]: [
      {
        scheduleDate: {
          [Op.lte]: new Date()
        }
      },
      {
        scheduleDate: { [Op.is]: null }
      }
    ]
  };

  const messages = await Message.findAll({
    where,
    include: [
      {
        model: Contact,
        as: "contact",
        where: {
          tenantId,
          [Op.or]: [
            {
              number: {
                [Op.notIn]: ["", "null"]
              }
            },
            {
              remoteJid: {
                [Op.not]: null as unknown as string
              }
            },
            {
              lid: {
                [Op.not]: null as unknown as string
              }
            }
          ]
        }
      },
      {
        model: Ticket,
        as: "ticket",
        where: {
          tenantId,
          [Op.or]: {
            status: { [Op.ne]: "closed" },
            isFarewellMessage: true
          },
          channel: "whatsapp",
          whatsappId: sessionId
        },
        include: ["contact"]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ],
    order: [["createdAt", "ASC"]]
  });

  for (const message of messages) {
    const { ticket } = message;

    try {
      const jid = resolveBaileysJid(ticket.contact, ticket);
      let response: any;

      if (message.mediaType !== "chat" && message.mediaName) {
        const mediaPath = join(__dirname, "..", "..", "..", "public", message.mediaName);
        const buffer = fs.readFileSync(mediaPath);
        const mimeType =
          mime.lookup(message.mediaName) ||
          `${message.mediaType}/${message.mediaName.split(".").pop() || "octet-stream"}`;
        const mimeString = String(mimeType);

        if (mimeString.startsWith("image/")) {
          response = await sock.sendMessage(jid, {
            image: buffer,
            caption: message.body || undefined
          } as any);
        } else if (mimeString.startsWith("video/")) {
          response = await sock.sendMessage(jid, {
            video: buffer,
            caption: message.body || undefined
          } as any);
        } else if (mimeString.startsWith("audio/")) {
          response = await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: mimeString,
            ptt: true
          } as any);
        } else {
          response = await sock.sendMessage(jid, {
            document: buffer,
            fileName: message.mediaName,
            mimetype: mimeString,
            caption: message.body || undefined
          } as any);
        }

        logger.info("sendMessage media (baileys)");
      } else {
        response = await sock.sendMessage(jid, {
          text: message.body
        } as any);
        logger.info("sendMessage text (baileys)");
      }

      const messageId = response?.key?.id;
      if (!messageId) {
        throw new Error("Baileys send returned no message id");
      }

      await Message.update(
        {
          messageId,
          status: "sended",
          ack: 1
        },
        { where: { id: message.id } }
      );

      await sleepRandomTime({
        minMilliseconds: Number(process.env.MIN_SLEEP_INTERVAL || 500),
        maxMilliseconds: Number(process.env.MAX_SLEEP_INTERVAL || 2000)
      });

      logger.info(`sendMessage baileys ${messageId}`);
    } catch (error: any) {
      const ticketId = message.ticket?.id;

      if (error?.code === "ENOENT") {
        await Message.destroy({
          where: { id: message.id }
        });
      }

      logger.error(`Error message is (tenant: ${tenantId} | Ticket: ${ticketId})`);
      logger.error(`Error send message baileys (id: ${message.id})::${error}`);
    }
  }
};

export default SendMessagesSystemBaileys;
