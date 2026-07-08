/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Op } from "sequelize";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import Contact from "../../models/Contact";
import SendMessageSystemProxy from "../../helpers/SendMessageSystemProxy";

const SendMessagesSchenduleWbot = async (): Promise<void> => {
  const currentDate = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: process.env.TIMEZONE || "America/Sao_Paulo"
    })
  );
  const twentyFourHoursAgo = new Date(
    currentDate.getTime() - 24 * 60 * 60 * 1000
  );

  const where = {
    fromMe: true,
    messageId: { [Op.is]: null },
    status: "pending",
    scheduleDate: {
      [Op.lte]: currentDate,
      [Op.gte]: twentyFourHoursAgo
    }
  };
  const messages = await Message.findAll({
    where,
    include: [
      {
        model: Contact,
        as: "contact"
      },
      {
        model: Ticket,
        as: "ticket",
        where: {
          status: ["open", "pending"]
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
    logger.info(
      `Message Schendule SendMessage: ${message.id} | Tenant: ${message.tenantId} `
    );

    try {
      const sent = await SendMessageSystemProxy({
        ticket: message.ticket,
        messageData: message.toJSON(),
        media: null,
        userId: message.userId
      });

      await message.update({
        messageId: sent.id?.id || sent.messageId,
        status: "sended",
        ack: 2,
        userId: message.userId
      });
    } catch (error) {
      logger.error(
        "SendMessagesSchenduleWbot > SendMessageSystemProxy",
        error
      );
    }
  }
};

export default SendMessagesSchenduleWbot;
