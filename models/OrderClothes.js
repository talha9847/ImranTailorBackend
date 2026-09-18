const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderClothes = sequelize.define(
  "OrderClothes",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    cloth_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    cloth_photo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "order_clothes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = OrderClothes;
