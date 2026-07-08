import { Request, Response } from "express";
import User from "../models/User";
import InternalMessage from "../models/InternalMessage";
import { getIO } from "../libs/socket";
import { Op } from "sequelize";

function toId(value: string | number | undefined): number {
  return Number(value);
}

function serializeMessage(msg: InternalMessage, senderName?: string) {
  const json = msg.toJSON() as Record<string, unknown>;
  return {
    ...json,
    senderId: toId(json.senderId as number),
    receiverId: toId(json.receiverId as number),
    senderName: senderName || (msg as any).sender?.name || "Atendente"
  };
}

function emitInternalMessage(
  tenantId: number,
  userId: number,
  payload: Record<string, unknown>
): void {
  getIO().emit(`${tenantId}:internal_message:${userId}`, {
    type: "internal_message",
    ...payload
  });
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const peerId = toId(req.params.userId);
    const currentUserId = toId(req.user.id);

    const messages = await InternalMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, receiverId: peerId },
          { senderId: peerId, receiverId: currentUserId }
        ]
      },
      order: [["createdAt", "ASC"]],
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name"]
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "name"]
        }
      ]
    });

    const messagesWithSenderName = messages.map(msg =>
      serializeMessage(msg, (msg as any).sender?.name)
    );

    return res.json(messagesWithSenderName);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar mensagens" });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  try {
    const receiverId = toId(req.body.receiverId);
    const senderId = toId(req.user.id);
    const tenantId = toId(req.user.tenantId);
    const { message } = req.body;

    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ error: "ERR_INVALID_MESSAGE" });
    }

    const internalMessage = await InternalMessage.create({
      senderId,
      receiverId,
      message: String(message).trim()
    });

    const messageWithUser = await InternalMessage.findByPk(internalMessage.id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name"]
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "name"]
        }
      ]
    });

    if (!messageWithUser) {
      return res.status(500).json({ error: "Erro ao enviar mensagem" });
    }

    const payload = serializeMessage(
      messageWithUser,
      (messageWithUser as any).sender?.name
    );

    emitInternalMessage(tenantId, receiverId, payload);
    emitInternalMessage(tenantId, senderId, payload);

    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<Response> => {
  try {
    const peerId = toId(req.params.userId);
    const currentUserId = toId(req.user.id);

    await InternalMessage.update(
      { read: true },
      {
        where: {
          senderId: peerId,
          receiverId: currentUserId,
          read: false
        }
      }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao marcar mensagens como lidas" });
  }
};
