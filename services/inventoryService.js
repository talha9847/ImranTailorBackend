const { Inventory } = require("../models/association");

async function getAllInventory() {
  try {
    const inventory = await Inventory.findAll({
      order: [["id", "ASC"]],
    });

    return inventory;
  } catch (error) {
    throw error;
  }
}

async function getInventoryById(id) {
  try {
    const inventory = await Inventory.findByPk(id);

    if (!inventory) {
      const error = new Error("Inventory not found");
      error.statusCode = 404;
      throw error;
    }

    return inventory;
  } catch (error) {
    throw error;
  }
}

async function createInventory(data) {
  try {
    const { cloth_name, quantity, buying_price, selling_price } = data;

    const inventory = await Inventory.create({
      cloth_name,
      quantity,
      buying_price,
      selling_price,
    });

    return inventory;
  } catch (error) {
    throw error;
  }
}

async function updateInventory(id, data) {
  try {
    const inventory = await Inventory.findByPk(id);

    if (!inventory) {
      const error = new Error("Inventory not found");
      error.statusCode = 404;
      throw error;
    }

    await inventory.update(data);

    return inventory;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
};
