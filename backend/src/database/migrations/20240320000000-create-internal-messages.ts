import { QueryInterface, DataTypes } from 'sequelize'

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable('InternalMessages', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      senderId: {
        type: DataTypes.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      receiverId: {
        type: DataTypes.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable('InternalMessages')
  }
} 