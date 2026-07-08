// import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import ShowTicketService from "./ShowTicketService";
import CampaignContacts from "../../models/CampaignContacts";
import socketEmit from "../../helpers/socketEmit";
// import CheckChatBotWelcome from "../../helpers/CheckChatBotWelcome";
import CheckChatBotFlowWelcome from "../../helpers/CheckChatBotFlowWelcome";
import canSendAutoAttendanceMessage from "../../helpers/canSendAutoAttendanceMessage";
import withTicketCreationLock from "../../helpers/ticketCreationLock";
import CreateLogTicketService from "./CreateLogTicketService";
import MessageModel from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import ListSettingsService from "../SettingServices/ListSettingsService";
import {
  isLikelyLid,
  isLikelyPhone
} from "../../helpers/contactJidUtils";

interface Data {
  contact: Contact;
  whatsappId: number;
  unreadMessages: number;
  tenantId: number | string;
  groupContact?: Contact;
  msg?: any;
  isSync?: boolean;
  channel: string;
}

const findOpenTicketForRelatedContacts = async ({
  contact,
  tenantId,
  whatsappId
}: {
  contact: Contact;
  tenantId: number | string;
  whatsappId: number;
}): Promise<Ticket | null> => {
  const ext = contact as Contact & { lid?: string; remoteJid?: string };
  const relatedFilters: Array<Record<string, unknown>> = [];

  if (contact.number && isLikelyPhone(contact.number)) {
    relatedFilters.push({ number: contact.number });
  }
  if (ext.lid) {
    relatedFilters.push({ lid: ext.lid });
    if (isLikelyLid(ext.lid)) {
      relatedFilters.push({ number: ext.lid });
    }
  }
  if (ext.remoteJid) {
    relatedFilters.push({ remoteJid: ext.remoteJid });
  }

  if (relatedFilters.length === 0) {
    return null;
  }

  const relatedContacts = await Contact.findAll({
    where: {
      tenantId,
      [Op.or]: relatedFilters
    },
    attributes: ["id"]
  });

  if (relatedContacts.length <= 1) {
    return null;
  }

  const contactIds = relatedContacts.map(related => related.id);

  return Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      tenantId,
      whatsappId,
      contactId: {
        [Op.in]: contactIds
      }
    },
    include: [
      {
        model: Contact,
        as: "contact",
        include: [
          "extraInfo",
          "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        association: "whatsapp",
        attributes: ["id", "name", "wavoip", "logo"]
      }
    ]
  });
};

const FindOrCreateTicketService = async ({
                                           contact,
                                           whatsappId,
                                           unreadMessages,
                                           tenantId,
                                           groupContact,
                                           msg,
                                           isSync,
                                           channel
                                         }: Data): Promise<Ticket | any> => {
  // se for uma mensagem de campanha, não abrir tícket
  if (msg && msg.fromMe) {
    const msgCampaign = await CampaignContacts.findOne({
      where: {
        contactId: contact.id,
        messageId: msg.id?.id || msg.message_id || msg.item_id
      }
    });
    if (msgCampaign?.id) {
      return { isCampaignMessage: true };
    }
  }

  if (msg && msg.fromMe) {
    const farewellMessage = await MessageModel.findOne({
      where: { messageId: msg.id?.id || msg.message_id || msg.item_id },
      include: ["ticket"]
    });

    if (
      farewellMessage?.ticket?.status === "closed" &&
      farewellMessage?.ticket.lastMessage === msg.body
    ) {
      const ticket = farewellMessage.ticket as any;
      ticket.isFarewellMessage = true;
      return ticket;
    }
  }

  const lockContactId = groupContact ? groupContact.id : contact.id;
  const lockKey = `${tenantId}:${whatsappId}:${lockContactId}`;

  return withTicketCreationLock(lockKey, async () => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      tenantId,
      whatsappId,
      contactId: groupContact ? groupContact.id : contact.id
    },
    include: [
      {
        model: Contact,
        as: "contact",
        include: [
          "extraInfo",
          "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        association: "whatsapp",
        attributes: ["id", "name", "wavoip", "logo"]
      }
    ]
  });

  if (ticket) {
    unreadMessages =
      ["telegram", "waba", "instagram", "messenger"].includes(channel) &&
      unreadMessages > 0
        ? (unreadMessages += ticket.unreadMessages)
        : unreadMessages;
    await ticket.update({ unreadMessages });
    socketEmit({
      tenantId,
      type: "ticket:update",
      payload: ticket
    });
    return ticket;
  }

  if (!groupContact) {
    ticket = await findOpenTicketForRelatedContacts({
      contact,
      tenantId,
      whatsappId
    });

    if (ticket) {
      await ticket.update({ unreadMessages });
      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });
      return ticket;
    }
  }

  if (groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        tenantId,
        whatsappId
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          association: "whatsapp",
          attributes: ["id", "name"]
        }
      ]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });

      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });

      return ticket;
    }
  } else {
    ticket = await Ticket.findOne({
      where: {
        // updatedAt: {
        //   [Op.between]: [+subHours(new Date(), 24), +new Date()]
        // },
        status: {
          [Op.in]: ["open", "pending"]
        },
        tenantId,
        whatsappId,
        contactId: contact.id
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          association: "whatsapp",
          attributes: ["id", "name", "wavoip"]
        }
      ]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });

      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });

      return ticket;
    }
  }

  const DirectTicketsToWallets =
    (await ListSettingsService(tenantId))?.find(
      s => s.key === "DirectTicketsToWallets"
    )?.value === "enabled" || false;

  const ticketObj: any = {
    contactId: groupContact ? groupContact.id : contact.id,
    status: "pending",
    isGroup: !!groupContact,
    unreadMessages,
    whatsappId,
    tenantId,
    channel
  };

  const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId },
    attributes: ['queueId']
  });

  if (whatsapp) {
    if (whatsapp.queueId) {
      ticketObj.queueId = whatsapp.queueId;
    }
  }

  if (DirectTicketsToWallets && contact.id) {
    const wallet: any = contact;
    const wallets = await wallet.getWallets();
    if (wallets && wallets[0]?.id) {
      ticketObj.status = "open";
      ticketObj.userId = wallets[0].id;
      ticketObj.startedAttendanceAt = new Date().getTime();
    }
  }

  const ticketCreated = await Ticket.create(ticketObj);

  await CreateLogTicketService({
    ticketId: ticketCreated.id,
    type: "create"
  });

  if ((msg && !msg.fromMe) || !ticketCreated.userId || isSync) {
    if (await canSendAutoAttendanceMessage(ticketCreated)) {
      await CheckChatBotFlowWelcome(ticketCreated);
    }
  }

  ticket = await ShowTicketService({ id: ticketCreated.id, tenantId });
  ticket.setDataValue("isCreated", true);

  socketEmit({
    tenantId,
    type: "ticket:update",
    payload: ticket
  });

  return ticket;
  });
};

export default FindOrCreateTicketService;
