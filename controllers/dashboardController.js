const dashboardService = require("../services/dashboardService");

// ========================================
// GET DASHBOARD
// ========================================

const getDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getDashboardData();

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error(
      "Get dashboard error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load dashboard",
    });
  }
};

module.exports = {
  getDashboard,
};
