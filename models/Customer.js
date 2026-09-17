const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Customer = sequelize.define(
  "Customers",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    customer_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    contact: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "customers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = Customer;
