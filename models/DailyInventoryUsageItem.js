const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DailyInventoryUsageItem = sequelize.define(
  "DailyInventoryUsageItem",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    usage_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    inventory_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    buying_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    selling_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "daily_inventory_usage_items",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["usage_id", "inventory_id"],
      },
    ],
  },
);

module.exports = DailyInventoryUsageItem;
