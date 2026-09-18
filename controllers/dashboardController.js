const dashboardService = require("../services/dashboardService");

async function getDashboard(req, res) {
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

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get dashboard data",
    });
  }
}

module.exports = {
  getDashboard,
};
