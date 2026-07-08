import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState,
  WASocket
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import pino from "pino";
import { rm } from "fs/promises";

import Queue from "./Queue";
import { getIO } from "./socket";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import HandleBaileysMessage from "../services/WbotServices/helpers/HandleBaileysMessage";
import HandleBaileysAck from "../services/WbotServices/helpers/HandleBaileysAck";
import VerifyCallBaileys from "../services/WbotServices/VerifyCallBaileys";

interface Session extends WASocket {
  id: number;
  isOpen?: boolean;
  checkMessages?: any;
}

const queuePendingMessages = async (
  session: Session,
  tenantId: number | string
): Promise<void> => {
  try {
    if (!session.isOpen) return;
    Queue.add("SendMessages", { sessionId: session.id, tenantId });
  } catch (error) {
    logger.error(`ERROR: queuePendingMessages Tenant: ${tenantId}:: ${error}`);
  }
};

const clearSessionInterval = (session?: Session): void => {
  if (session?.checkMessages) {
    clearInterval(session.checkMessages);
    session.checkMessages = null;
  }
};

const sessions: Session[] = [];
const initializingSessions = new Map<number, Promise<Session>>();
const BAILEYS_AUTH_ROOT = path.resolve(__dirname, "..", "..", ".baileys_auth");
const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });

const emitSessionUpdate = (whatsapp: Whatsapp, action: "update" | "readySession" = "update"): void => {
  const io = getIO();
  io.emit(`${whatsapp.tenantId}:whatsappSession`, {
    action,
    session: whatsapp
  });
};

const getSessionIndex = (whatsappId: number): number =>
  sessions.findIndex(session => session.id === whatsappId);

const setSession = (session: Session): void => {
  const index = getSessionIndex(session.id);
  if (index === -1) {
    sessions.push(session);
    return;
  }
  sessions[index] = session;
};

const removeSession = (whatsappId: number): void => {
  const index = getSessionIndex(whatsappId);
  if (index === -1) return;

  clearSessionInterval(sessions[index]);
  try {
    sessions[index].end(new Error("session removed"));
  } catch {
    /* ignore */
  }
  sessions.splice(index, 1);
};

export const apagarPastaSessaoBaileys = async (
  id: number | string
): Promise<void> => {
  const authPath = path.join(BAILEYS_AUTH_ROOT, `session-${id}`);
  try {
    await rm(authPath, { recursive: true, force: true });
  } catch (error) {
    logger.error(`apagarPastaSessaoBaileys ${id}: ${error}`);
  }
};

export const removeBaileys = (whatsappId: number): void => {
  removeSession(whatsappId);
};

export const isBaileysInitializing = (whatsappId: number): boolean =>
  initializingSessions.has(whatsappId);

export const getBaileys = (whatsappId: number): Session => {
  const index = getSessionIndex(whatsappId);
  if (index === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  return sessions[index];
};

const scheduleReconnect = (whatsapp: Whatsapp): void => {
  setTimeout(() => {
    if (isBaileysInitializing(whatsapp.id)) return;
    import("../services/WbotServices/StartWhatsAppSession")
      .then(module => module.StartWhatsAppSession(whatsapp))
      .catch(error =>
        logger.error(`Baileys reconnect error session ${whatsapp.id}: ${error}`)
      );
  }, 3000);
};

const parseOwnNumber = (sock: Session): string | null => {
  const raw = sock.user?.id;
  if (!raw) return null;
  const normalized = jidNormalizedUser(raw);
  return normalized.split("@")[0] || null;
};

export const buildBaileysJid = (number: string): string =>
  `${String(number).replace(/\D/g, "")}@s.whatsapp.net`;

export const logoutBaileys = async (whatsappId: number): Promise<void> => {
  try {
    const session = getBaileys(whatsappId);
    await session.logout();
  } catch (error) {
    logger.error(`logoutBaileys ${whatsappId}: ${error}`);
  } finally {
    removeBaileys(whatsappId);
    await apagarPastaSessaoBaileys(whatsappId);
  }
};

export const initBaileys = async (whatsapp: Whatsapp): Promise<Session> => {
  const pending = initializingSessions.get(whatsapp.id);
  if (pending) return pending;

  const existingIndex = getSessionIndex(whatsapp.id);
  if (existingIndex !== -1) {
    const existing = sessions[existingIndex];
    if (existing.isOpen) return existing;
    removeSession(whatsapp.id);
  }

  const initPromise = (async (): Promise<Session> => {
    logger.info(`initBaileys: starting session ${whatsapp.name} (id=${whatsapp.id})`);
    const authPath = path.join(BAILEYS_AUTH_ROOT, `session-${whatsapp.id}`);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      logger: baileysLogger,
      printQRInTerminal: false,
      syncFullHistory: false,
      // online ajuda a receber oferta de chamada (CB:call) em tempo real
      markOnlineOnConnect: true,
      fireInitQueries: true,
      emitOwnEvents: true,
      generateHighQualityLinkPreview: true,
      defaultQueryTimeoutMs: 60_000,
      connectTimeoutMs: 60_000
    }) as Session;

    sock.id = whatsapp.id;
    sock.isOpen = false;
    setSession(sock);

    sock.ev.on("creds.update", () => {
      void saveCreds().catch(error =>
        logger.error(`Baileys saveCreds ${whatsapp.id}: ${error}`)
      );
    });

    sock.ev.on("messages.upsert", event => {
      if (!event.messages?.length) return;

      if (process.env.BAILEYS_VERBOSE === "true") {
        logger.debug(
          `Baileys messages.upsert session=${whatsapp.id} type=${event.type} count=${event.messages.length}`
        );
      }

      void HandleBaileysMessage(event.messages, whatsapp.id, sock);
    });

    sock.ev.on("messages.update", updates => {
      void HandleBaileysAck(updates as any);
    });

    sock.ev.on("call", calls => {
      void VerifyCallBaileys(calls, whatsapp.id, sock);
    });

    sock.ev.on("connection.update", async update => {
      try {
        const fresh = await Whatsapp.findByPk(whatsapp.id);
        if (!fresh) return;

        if (update.qr) {
          await fresh.update({
            qrcode: update.qr,
            status: "qrcode",
            retries: 0
          });
          emitSessionUpdate(fresh);
        }

        if (update.connection === "connecting" && !update.qr) {
          await fresh.update({ status: "OPENING" });
          emitSessionUpdate(fresh);
        }

        if (update.connection === "open") {
          sock.isOpen = true;
          const ownNumber = parseOwnNumber(sock);

          await fresh.update({
            status: "CONNECTED",
            qrcode: null,
            retries: 0,
            session: "baileys",
            number: ownNumber || fresh.number
          });

          try {
            await sock.sendPresenceUpdate("available");
          } catch (presenceError) {
            logger.warn(
              `Baileys presence available session=${whatsapp.id}: ${presenceError}`
            );
          }

          if (!sock.checkMessages) {
            sock.checkMessages = setInterval(
              queuePendingMessages,
              +(process.env.CHECK_INTERVAL || 5000),
              sock,
              fresh.tenantId
            );
          }

          emitSessionUpdate(fresh);
          emitSessionUpdate(fresh, "readySession");
        }

        if (update.connection === "close") {
          sock.isOpen = false;
          clearSessionInterval(sock);

          const statusCode = (update.lastDisconnect?.error as Boom | undefined)
            ?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;

          await fresh.update({
            status: loggedOut ? "DISCONNECTED" : "TIMEOUT",
            qrcode: null
          });
          emitSessionUpdate(fresh);

          removeSession(whatsapp.id);

          if (loggedOut) {
            await apagarPastaSessaoBaileys(whatsapp.id);
          } else if (fresh.isActive) {
            scheduleReconnect(fresh);
          }
        }
      } catch (error) {
        logger.error(`Baileys connection.update ${whatsapp.id}: ${error}`);
      }
    });

    return sock;
  })();

  initializingSessions.set(whatsapp.id, initPromise);

  try {
    return await initPromise;
  } finally {
    initializingSessions.delete(whatsapp.id);
  }
};
