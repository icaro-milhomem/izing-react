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
  AutoIncrement
} from "sequelize-typescript";
import Contact from "./Contact";
import Message from "./Message";
import Ticket from "./Ticket";
import User from "./User";

@Table({ freezeTableName: true })
class MessagesOffLine extends Model<MessagesOffLine> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default(0)
  @Column
  ack: number;

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

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  tableName: "MessagesOffLine";
}

export default MessagesOffLine;
