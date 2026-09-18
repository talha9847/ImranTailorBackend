const ClothesOrder = require("./ClothesOrder");
const Customer = require("./Customer");

const DailyInventoryUsage = require("./DailyInventoryUsage");
const DailyInventoryUsageItem = require("./DailyInventoryUsageItem");
const Inventory = require("./Inventory");

const OrderClothes = require("./OrderClothes");

DailyInventoryUsage.hasMany(DailyInventoryUsageItem, {
  foreignKey: "usage_id",
  as: "items",
  onDelete: "CASCADE",
});

DailyInventoryUsageItem.belongsTo(DailyInventoryUsage, {
  foreignKey: "usage_id",
  as: "usage",
});

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

ClothesOrder.hasMany(OrderClothes, {
  foreignKey: "order_id",
  as: "clothes",
  onDelete: "CASCADE",
});

OrderClothes.belongsTo(ClothesOrder, {
  foreignKey: "order_id",
  as: "order",
});

module.exports = {
  Inventory,
  DailyInventoryUsage,
  DailyInventoryUsageItem,
  Customer,
  ClothesOrder,
  OrderClothes,
};
