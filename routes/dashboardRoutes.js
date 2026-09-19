const express = require("express");

const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const middleware = require("../middleware/authenticate");
// =========================================================
// DASHBOARD ROUTES
// =========================================================

router.get("/getDashboard", middleware, dashboardController.getDashboard);

module.exports = router;
