const express = require("express");
const inventoryController=require('../controllers/inventoryController')


const router = express.Router();

// Get all inventory
router.get("/getInventory", inventoryController.getInventory);

// Get inventory by ID
router.get("/getInventoryById/:id", inventoryController.getInventoryById);

// Create inventory
router.post("/createInventory", inventoryController.createInventory);

// Update inventory
router.put("/updateInventory/:id", inventoryController.updateInventory);

module.exports = router;
