const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ClothesOrder = sequelize.define(
  "ClothesOrders",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    note_photo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: [["pending", "ready", "delivered"]],
      },
    },

    remainder_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "clothes_orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = ClothesOrder;
