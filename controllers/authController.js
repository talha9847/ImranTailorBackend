const authService = require("../services/authService");
const jwtService = require("../services/jwtService");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await authService.loginUser(email, password);

    const token = await jwtService.signJwt({
      email: user.email,
      role: user.role,
      username: user.username,
    });

    const NODE_ENV = process.env.NODE_ENV;

    res.cookie("token", token, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}

function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
}

async function me(req, res) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    const decoded = await jwtService.verifyJwt(token);
    if (!decoded) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user: decoded });
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session" });
  }
}
module.exports = {
  login,
  logout,
  me,
};
