const authService = require("../services/authService");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await authService.loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  login,
};
