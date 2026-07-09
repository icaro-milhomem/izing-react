import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import socketEmit from "../../helpers/socketEmit";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface MessageData {
  id?: string;
  messageId: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  timestamp?: number;
}
interface Request {
  messageData: MessageData;
  tenantId: string | number;
}

const containsPixCode = (message: string): boolean => {
  const pixPattern = /00020101021226850014br\.gov\.bcb\.pix2563qrcodepix\.bb\.com\.br\/pix\/v2\/[a-zA-Z0-9-]+/;
  return pixPattern.test(message);
};

const normalizeMessageTimestamp = (timestamp?: number): number | undefined => {
  if (timestamp == null || !Number.isFinite(timestamp)) return timestamp;
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
};

const CreateMessageService = async ({
  messageData,
  tenantId
}: Request): Promise<Message> => {
  if (messageData.body && containsPixCode(messageData.body)) {
    messageData.body = messageData.body
      .split('\n')
      .filter(line => !/^[^:]+:\s*$/i.test(line.trim()))
      .join('\n')
      .trim();
  }
  if (messageData.timestamp != null) {
    messageData.timestamp = normalizeMessageTimestamp(messageData.timestamp);
  }
  const msg = await Message.findOne({
    where: { messageId: messageData.messageId, tenantId }
  });
  if (!msg) {
    try {
      await Message.create({ ...messageData, tenantId });
    } catch (err: any) {
      if (err?.name !== "SequelizeUniqueConstraintError") {
        throw err;
      }
      const existing = await Message.findOne({
        where: { messageId: messageData.messageId, tenantId }
      });
      if (!existing) throw err;
      await existing.update(messageData);
    }
  } else {
    await msg.update(messageData);
  }
  const message = await Message.findOne({
    where: { messageId: messageData.messageId, tenantId },
    include: [
      {
        model: Ticket,
        as: "ticket",
        where: { tenantId },
        include: ["contact", "whatsapp"]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const plainMessage = message.get({ plain: true });

  socketEmit({
    tenantId,
    type: "chat:create",
    payload: plainMessage
  });

  const ticket = await ShowTicketService({
    id: messageData.ticketId,
    tenantId
  });

  socketEmit({
    tenantId,
    type: "ticket:update",
    payload: ticket
  });

  return message;
};

export default CreateMessageService;
