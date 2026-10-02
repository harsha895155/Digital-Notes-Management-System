const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query && req.query.token) {
      // 2. Allow token in query parameter for authenticated download / preview tabs
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required. No token provided.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is missing from environment variables");
      return res.status(500).json({
        message: "Server configuration error: JWT secret not set.",
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, email, ... }
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
      });
    }
    return res.status(401).json({
      message: "Invalid or malformed authentication token.",
    });
  }
};

module.exports = authMiddleware;
