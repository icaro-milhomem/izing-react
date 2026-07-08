import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  id: string | number;
  tenantId: string | number;
}

/** Ticket enxuto para listagem de mensagens e sockets (sem tags/extraInfo/wallets). */
const ShowTicketLightService = async ({
  id,
  tenantId
}: Request): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: [
          "id",
          "name",
          "number",
          "profilePicUrl",
          "messengerId",
          "isGroup",
          "email"
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

  if (!ticket || ticket.tenantId !== tenantId) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  return ticket;
};

export default ShowTicketLightService;
