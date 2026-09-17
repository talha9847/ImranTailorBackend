const service = require("../services/dailyInventoryUsageService");

// GET INVENTORY

async function getInventoryProducts(req, res) {
  try {
    const inventory = await service.getInventoryProducts();

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch inventory",
    });
  }
}

// GET USAGE BY DATE

async function getUsageByDate(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const usage = await service.getUsageByDate(date);

    return res.status(200).json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch usage",
    });
  }
}

// GET HISTORY

async function getUsageHistory(req, res) {
  try {
    const history = await service.getUsageHistory();

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch history",
    });
  }
}

// SAVE USAGE

async function saveUsageItem(req, res) {
  try {
    const { usage_date, inventory_id, quantity } = req.body;

    if (!usage_date) {
      return res.status(400).json({
        success: false,
        message: "usage_date is required",
      });
    }

    if (!inventory_id) {
      return res.status(400).json({
        success: false,
        message: "inventory_id is required",
      });
    }

    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: "quantity is required",
      });
    }

    const result = await service.saveUsageItem({
      usage_date,

      inventory_id: Number(inventory_id),

      quantity: Number(quantity),
    });

    return res.status(200).json({
      success: true,

      message: "Inventory usage saved successfully",

      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to save usage",
    });
  }
}

module.exports = {
  getInventoryProducts,
  getUsageByDate,
  getUsageHistory,
  saveUsageItem,
};
