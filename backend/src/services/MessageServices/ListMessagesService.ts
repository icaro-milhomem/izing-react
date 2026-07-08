import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import MessagesOffLine from "../../models/MessageOffLine";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import ShowTicketLightService from "../TicketServices/ShowTicketLightService";

interface Request {
  ticketId: string;
  tenantId: number | string;
  pageNumber?: string;
}

interface Response {
  messages: Message[];
  messagesOffLine: MessagesOffLine[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const MESSAGE_ATTRIBUTES = [
  "id",
  "messageId",
  "body",
  "fromMe",
  "read",
  "mediaType",
  "mediaUrl",
  "timestamp",
  "createdAt",
  "updatedAt",
  "ticketId",
  "contactId",
  "ack",
  "isDeleted",
  "edited",
  "scheduleDate",
  "quotedMsgId",
  "sendType",
  "status"
];

const OFFLINE_MESSAGE_ATTRIBUTES = [
  "id",
  "body",
  "fromMe",
  "read",
  "mediaType",
  "mediaUrl",
  "createdAt",
  "updatedAt",
  "ticketId",
  "contactId",
  "ack",
  "isDeleted",
  "quotedMsgId",
  "userId"
];

const CONTACT_ATTRIBUTES = ["id", "name", "profilePicUrl", "number"];

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  tenantId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketLightService({ id: ticketId, tenantId });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await Message.findAndCountAll({
    limit,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: CONTACT_ATTRIBUTES
      },
      {
        model: Message,
        as: "quotedMsg",
        attributes: MESSAGE_ATTRIBUTES,
        include: [
          {
            model: Contact,
            as: "contact",
            attributes: CONTACT_ATTRIBUTES
          }
        ]
      },
      {
        model: Ticket,
        where: {
          queueId: ticket.queueId,
          contactId: ticket.contactId,
          whatsappId: ticket.whatsappId
        },
        required: true,
        attributes: ["id", "channel", "whatsappId"],
        include: [
          {
            association: "whatsapp",
            attributes: ["id", "name", "logo"]
          }
        ]
      }
    ],
    attributes: MESSAGE_ATTRIBUTES,
    offset,
    order: [["createdAt", "DESC"]]
  });

  let messagesOffLine: MessagesOffLine[] = [];
  if (+pageNumber === 1) {
    const { rows } = await MessagesOffLine.findAndCountAll({
      where: { ticketId },
      limit: 30,
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: CONTACT_ATTRIBUTES
        },
        {
          model: Message,
          as: "quotedMsg",
          attributes: MESSAGE_ATTRIBUTES,
          include: [
            {
              model: Contact,
              as: "contact",
              attributes: CONTACT_ATTRIBUTES
            }
          ]
        }
      ],
      attributes: OFFLINE_MESSAGE_ATTRIBUTES,
      order: [["createdAt", "DESC"]]
    });
    messagesOffLine = rows;
  }

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    messagesOffLine,
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
