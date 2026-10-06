const jwt = require("jsonwebtoken");

/**
 * Primary JWT Authentication Middleware
 * Enforces authenticated identity across all protected resources
 */
const authMiddleware = (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Check HTTP-only cookie if used
      token = req.cookies.accessToken;
    } else if (req.query && req.query.token) {
      // 3. Query parameter for authenticated downloads / previews
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required. No token provided.",
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT secret is missing from environment variables");
      return res.status(500).json({
        message: "Server configuration error: JWT secret not set.",
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      email: (decoded.email || "").toLowerCase().trim(),
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please refresh your session or log in again.",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      message: "Invalid or malformed authentication token.",
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * Middleware ensuring route parameter :email matches the authenticated user
 * Prevents accessing another user's data by tampering with URL parameters
 */
const verifyEmailOwnership = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const paramEmail = (req.params.email || req.body.userEmail || "").toLowerCase().trim();
  if (paramEmail && paramEmail !== req.user.email) {
    return res.status(403).json({
      message: "Forbidden: You are not authorized to access data for this email address.",
    });
  }

  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.verifyEmailOwnership = verifyEmailOwnership;
