const express = require("express");

const controller = require("../controllers/dailyInventoryUsageController");

const router = express.Router();
const middleware = require("../middleware/authenticate");

// Get inventory products
router.get(
  "/getInventoryProducts",
  middleware,
  controller.getInventoryProducts,
);

// Get usage by date
router.get("/getUsageByDate", middleware, controller.getUsageByDate);

// Get last 10 days history
router.get("/getUsageHistory", middleware, controller.getUsageHistory);

// Save usage item
router.post("/saveUsageItem", middleware, controller.saveUsageItem);
router.post("/revertUsageItem", middleware, controller.revertUsageItem);

router.get(
  "/getSellingHistoryByDateRange",middleware,
  controller.getSellingHistoryByDateRange,
);

module.exports = router;
