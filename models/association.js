const ClothesOrder = require("./ClothesOrder");
const Customer = require("./Customer");
const DailyInventoryUsage = require("./DailyInventoryUsage");
const DailyInventoryUsageItem = require("./DailyInventoryUsageItem");
const Inventory = require("./Inventory");

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
Customer.hasMany(ClothesOrder, {
  foreignKey: "customer_id",
  as: "orders",
});

ClothesOrder.belongsTo(Customer, {
  foreignKey: "customer_id",
  as: "customer",
});

module.exports = {
  Inventory,
  DailyInventoryUsage,
  DailyInventoryUsageItem,
  Customer,
  ClothesOrder,
};
