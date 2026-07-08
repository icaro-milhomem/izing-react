import { Model, DataTypes } from "sequelize";
import sequelize from "../config/sequelize";
import User from "./User";

class InternalMessage extends Model {
  public id!: number;
  public senderId!: number;
  public receiverId!: number;
  public message!: string;
  public read!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InternalMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: "InternalMessage"
  }
);

// Associações com User
InternalMessage.belongsTo(User, { as: "sender", foreignKey: "senderId" });
InternalMessage.belongsTo(User, { as: "receiver", foreignKey: "receiverId" });

export default InternalMessage; 