const express = require("express");

const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

// =========================================================
// DASHBOARD ROUTES
// =========================================================

router.get("/getDashboard", dashboardController.getDashboard);

module.exports = router;
