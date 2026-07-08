/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "../utils/logger";
import UpsertMessageAPIService from "../services/ApiMessageService/UpsertMessageAPIService";
import Queue from "../libs/Queue";
import VerifyContactWuzapi from "../services/WbotServices/helpers/VerifyContactWuzapi";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";

export default {
  key: "SendMessageAPI",
  options: {
    delay: 6000,
    attempts: 50,
    removeOnComplete: true,
    removeOnFail: false,
    backoff: {
      type: "fixed",
      delay: 60000 * 3
    }
  },
  async handle({ data }: any) {
    try {
      const number = String(data.number || "").replace(/\D/g, "");

      if (!number) {
        const payload = {
          ack: -1,
          body: data.body,
          messageId: "",
          number: data.number,
          externalKey: data.externalKey,
          error: "number invalid in whatsapp",
          type: "hookMessageStatus",
          authToken: data.authToken
        };

        if (data?.apiConfig?.urlMessageStatus) {
          Queue.add("WebHooksAPI", {
            url: data.apiConfig.urlMessageStatus,
            type: payload.type,
            payload
          });
        }
        return payload;
      }

      const contact = await VerifyContactWuzapi(
        number,
        data?.name || number,
        data.tenantId,
        false
      );

      const ticket = await FindOrCreateTicketService({
        contact,
        whatsappId: data.sessionId,
        unreadMessages: 0,
        tenantId: data.tenantId,
        groupContact: undefined,
        msg: {
          fromMe: true,
          id: { id: `api-${Date.now()}` },
          body: data.body
        },
        channel: "whatsapp"
      });

      await CreateMessageSystemService({
        msg: data,
        tenantId: data.tenantId,
        ticket,
        sendType: "API",
        status: "pending"
      });

      await ticket.update({
        apiConfig: {
          ...data.apiConfig,
          externalKey: data.externalKey
        }
      });
    } catch (error) {
      logger.error({ message: "Error send message api", error });
      throw new Error(error);
    }
  }
};
