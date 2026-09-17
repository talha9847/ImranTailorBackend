const express = require("express");

const controller = require("../controllers/dailyInventoryUsageController");

const router = express.Router();

// Get inventory products
router.get("/getInventoryProducts", controller.getInventoryProducts);

// Get usage by date
router.get("/getUsageByDate", controller.getUsageByDate);

// Get last 10 days history
router.get("/getUsageHistory", controller.getUsageHistory);

// Save usage item
router.post("/saveUsageItem", controller.saveUsageItem);

module.exports = router;
