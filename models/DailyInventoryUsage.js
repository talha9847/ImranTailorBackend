const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DailyInventoryUsage = sequelize.define(
  "DailyInventoryUsage",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    usage_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },

    total_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "daily_inventory_usage",
    timestamps: false,
  },
);

module.exports = DailyInventoryUsage;
