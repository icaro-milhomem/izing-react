import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey,
  AllowNull
} from "sequelize-typescript";
import { v4 as uuidV4 } from "uuid";
import Contact from "./Contact";
import Tenant from "./Tenant";
import Ticket from "./Ticket";
import User from "./User";

@Table
class Message extends Model<Message> {
  @PrimaryKey
  @Default(uuidV4)
  @Column
  id: string;

  @Default(null)
  @AllowNull
  @Column
  messageId: string;

  @Default(0)
  @Column
  ack: number;

  @Default(null)
  @AllowNull
  @Column(DataType.ENUM("pending", "sended", "received"))
  status: string;

  @Default(null)
  @AllowNull
  @Column(DataType.TEXT)
  wabaMediaId: string;

  @Default(false)
  @Column
  read: boolean;

  @Default(false)
  @Column
  fromMe: boolean;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.VIRTUAL)
  get mediaName(): string | null {
    return this.getDataValue("mediaUrl");
  }

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    if (this.getDataValue("mediaUrl")) {
      const { BACKEND_URL, PORT } = process.env;
      const value = this.getDataValue("mediaUrl");
      // Extrair apenas o protocolo e host do BACKEND_URL
      let baseUrl = BACKEND_URL || 'http://localhost';
      
      // Se BACKEND_URL já é HTTPS sem porta explícita, usar diretamente (nginx faz proxy)
      // Se for HTTP ou tiver porta explícita, manter como está
      if (baseUrl.includes('://')) {
        const urlParts = baseUrl.split('://');
        const protocol = urlParts[0];
        const hostParts = urlParts[1].split(':');
        const host = hostParts[0];
        const existingPort = hostParts[1];
        
        // Se já tem porta explícita, manter
        if (existingPort) {
          baseUrl = `${protocol}://${host}:${existingPort}`;
        } else {
          // Se é HTTPS sem porta, não adicionar porta (nginx faz proxy na porta 443)
          // Se é HTTP sem porta, adicionar a porta do servidor
          if (protocol === 'https') {
            baseUrl = `${protocol}://${host}`;
          } else {
            const port = PORT || '3100';
            baseUrl = `${protocol}://${host}:${port}`;
          }
        }
      } else {
        // Fallback para URLs sem protocolo
        const port = PORT || '3100';
        baseUrl = `http://${baseUrl}:${port}`;
      }
      return `${baseUrl}/public/${value}`;
    }
    return null;
  }

  @Column
  mediaType: string;

  @Default(false)
  @Column
  isDeleted: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  // Adicionando a nova coluna 'edited'
  @Column(DataType.TEXT)
  edited: string;

  // @HasOne(() => Message, "messageId")
  @ForeignKey(() => Message)
  @Column
  quotedMsgId: string;

  @BelongsTo(() => Message, "quotedMsgId")
  quotedMsg: Message;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;

  @Default(null)
  @AllowNull
  @Column(DataType.BIGINT)
  timestamp: number;

  @ForeignKey(() => User)
  @Default(null)
  @AllowNull
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Default(null)
  @AllowNull
  @Column(DataType.DATE)
  scheduleDate: Date;

  @Default(null)
  @AllowNull
  @Column(
    DataType.ENUM("campaign", "chat", "external", "schedule", "bot", "sync", "API")
  )
  sendType: string;

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Default(null)
  @AllowNull
  @Column
  idFront: string;
}

export default Message;
