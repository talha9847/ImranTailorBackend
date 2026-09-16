const inventoryService = require("../services/inventoryService");

const getInventory = async (req, res) => {
  try {
    const inventory = await inventoryService.getAllInventory();

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Get Inventory Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch inventory",
    });
  }
};

const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await inventoryService.getInventoryById(id);

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Get Inventory By ID Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch inventory",
    });
  }
};

const createInventory = async (req, res) => {
  try {
    const inventory = await inventoryService.createInventory(req.body);

    return res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Create Inventory Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create inventory",
    });
  }
};

const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await inventoryService.updateInventory(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Update Inventory Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update inventory",
    });
  }
};

module.exports = {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
};
