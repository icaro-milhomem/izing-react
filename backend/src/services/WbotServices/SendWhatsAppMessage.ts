import AppError from "../../errors/AppError";
import getTicketBaileys from "../../helpers/getTicketBaileys";
import resolveBaileysJid from "../../helpers/resolveBaileysJid";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import UserMessagesLog from "../../models/UserMessagesLog";
import { logger } from "../../utils/logger";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  userId?: number | string | undefined;
  menuOptions?: {
    buttons?: Array<{ id: string; text: string }>;
    list?: {
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
    footer?: string;
  };
}

const buildInteractiveFallbackText = (
  body: string,
  menuOptions?: Request["menuOptions"]
): string => {
  if (!menuOptions) return body;

  let messageBody = body;

  if (menuOptions.buttons && menuOptions.buttons.length > 0) {
    messageBody = `${body}\n\n`;
    if (menuOptions.footer) {
      messageBody += `_${menuOptions.footer}_\n\n`;
    }
    messageBody += `*Opções:*\n`;
    menuOptions.buttons.forEach((button, index) => {
      messageBody += `${index + 1}. ${button.text}\n`;
    });
    messageBody += `\n_Digite o número da opção desejada._`;
  } else if (menuOptions.list) {
    messageBody = `${body}\n\n`;
    if (menuOptions.footer) {
      messageBody += `_${menuOptions.footer}_\n\n`;
    }
    messageBody += `*${menuOptions.list.buttonText}*\n\n`;
    menuOptions.list.sections.forEach((section, sectionIndex) => {
      if (section.title) {
        messageBody += `*${section.title}*\n`;
      }
      section.rows.forEach((row, rowIndex) => {
        const globalIndex = sectionIndex * 10 + rowIndex + 1;
        messageBody += `${globalIndex}. ${row.title}`;
        if (row.description) {
          messageBody += ` - ${row.description}`;
        }
        messageBody += `\n`;
      });
      messageBody += `\n`;
    });
    messageBody += `_Digite o número da opção desejada._`;
  }

  return messageBody;
};

const SendWhatsAppMessage = async ({
  body,
  ticket,
  userId,
  menuOptions
}: Request): Promise<any> => {
  try {
    const sock = await getTicketBaileys(ticket);
    const jid = resolveBaileysJid(ticket.contact, ticket);
    const text = buildInteractiveFallbackText(body, menuOptions);
    logger.info(`SendWhatsAppMessage Baileys ticket=${ticket.id} jid=${jid}`);
    const response = await sock.sendMessage(jid, { text } as any);

    await ticket.update({
      lastMessage: body,
      lastMessageAt: new Date().getTime()
    });

    try {
      if (userId && response?.key?.id) {
        await UserMessagesLog.create({
          messageId: response.key.id,
          userId,
          ticketId: ticket.id
        });
      }
    } catch (error) {
      logger.error(`Error criar log mensagem ${error}`);
    }

    return {
      id: { id: response?.key?.id },
      ack: 1
    };
  } catch (err: any) {
    logger.error(`SendWhatsAppMessage Baileys | Error: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
