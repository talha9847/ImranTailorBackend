const express = require("express");
const inventoryController = require("../controllers/inventoryController");
const middleware = require("../middleware/authenticate");

const router = express.Router();

// Get all inventory
router.get("/getInventory", middleware, inventoryController.getInventory);

// Get inventory by ID
router.get(
  "/getInventoryById/:id",
  middleware,
  inventoryController.getInventoryById,
);

// Create inventory
router.post(
  "/createInventory",
  middleware,
  inventoryController.createInventory,
);

// Update inventory
router.put(
  "/updateInventory/:id",
  middleware,
  inventoryController.updateInventory,
);

module.exports = router;
