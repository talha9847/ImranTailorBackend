const DailyInventoryUsage = require("./DailyInventoryUsage");
const DailyInventoryUsageItem = require("./DailyInventoryUsageItem");
const Inventory = require("./inventory");

// DailyInventoryUsage -> Items
DailyInventoryUsage.hasMany(DailyInventoryUsageItem, {
  foreignKey: "usage_id",
  as: "items",
  onDelete: "CASCADE",
});

DailyInventoryUsageItem.belongsTo(DailyInventoryUsage, {
  foreignKey: "usage_id",
  as: "usage",
});

// Inventory -> Usage Items
Inventory.hasMany(DailyInventoryUsageItem, {
  foreignKey: "inventory_id",
  as: "usageItems",
});

DailyInventoryUsageItem.belongsTo(Inventory, {
  foreignKey: "inventory_id",
  as: "inventory",
});

module.exports = {
  Inventory,
  DailyInventoryUsage,
  DailyInventoryUsageItem,
};
