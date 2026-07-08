/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBaileys } from "../libs/baileys";
import SendMessagesSystemBaileys from "../services/WbotServices/SendMessagesSystemBaileys";
import { logger } from "../utils/logger";

const sending: any = {};

export default {
  key: "SendMessages",
  options: {
    attempts: 0,
    removeOnComplete: true,
    removeOnFail: true
  },
  async handle({ data }: any) {
    try {
      if (sending[data.tenantId]) return;
      sending[data.tenantId] = true;

      getBaileys(data.sessionId);
      await SendMessagesSystemBaileys(data.sessionId, data.tenantId);
      sending[data.tenantId] = false;
    } catch (error) {
      logger.error({ message: "Error send messages", error });
      sending[data.tenantId] = false;
      throw new Error(error);
    }
  }
};
