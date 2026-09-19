const jwtService = require("../services/jwtService");

async function authenticate(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication Required" });
    }

    const decoded = await jwtService.verifyJwt(token);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticate;
