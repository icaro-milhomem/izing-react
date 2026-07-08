import { Op } from "sequelize";
import { subHours } from "date-fns";
import Message from "../models/Message";
import Setting from "../models/Setting";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";

const SETTING_KEY = "autoMessageCooldownHours";
const DEFAULT_COOLDOWN_HOURS = 24;

export const getAutoMessageCooldownHours = async (
  tenantId: number
): Promise<number> => {
  const fromEnv = Number(process.env.AUTO_ATTENDANCE_MESSAGE_COOLDOWN_HOURS);
  if (!Number.isNaN(fromEnv) && fromEnv >= 0) {
    return fromEnv;
  }

  const setting = await Setting.findOne({
    where: { key: SETTING_KEY, tenantId }
  });

  if (setting?.value) {
    const hours = Number(setting.value);
    if (!Number.isNaN(hours) && hours >= 0) return hours;
  }

  return DEFAULT_COOLDOWN_HOURS;
};

/**
 * Returns whether automatic attendance messages (greeting, absence, bot welcome)
 * may be sent to this contact. Blocks repeat sends within the cooldown window.
 */
export const canSendAutoAttendanceMessage = async (
  ticket: Pick<Ticket, "contactId" | "tenantId">
): Promise<boolean> => {
  if (!ticket.contactId) return true;

  const cooldownHours = await getAutoMessageCooldownHours(ticket.tenantId);
  if (cooldownHours === 0) return true;

  const since = subHours(new Date(), cooldownHours);

  const recent = await Message.findOne({
    where: {
      contactId: ticket.contactId,
      tenantId: ticket.tenantId,
      fromMe: true,
      sendType: "bot",
      userId: null,
      createdAt: { [Op.gte]: since }
    },
    attributes: ["id", "createdAt"],
    order: [["createdAt", "DESC"]]
  });

  if (recent) {
    logger.info(
      `Auto attendance message skipped for contact ${ticket.contactId} (tenant ${ticket.tenantId}): last bot message at ${recent.createdAt}`
    );
    return false;
  }

  return true;
};

export default canSendAutoAttendanceMessage;
