const mongoose = require("mongoose");

/**
 * Validates if string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
};

/**
 * Middleware to reject malformed MongoDB ObjectIds in params
 */
const validateIdParam = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !isValidObjectId(id)) {
      return res.status(400).json({
        message: `Invalid identifier format for '${paramName}'.`,
      });
    }
    next();
  };
};

/**
 * Sanitize object keys to prevent NoSQL injection ($ and . operator injection)
 */
const sanitizeNoSql = (req, res, next) => {
  const clean = (data) => {
    if (!data || typeof data !== "object") return;
    for (const key of Object.keys(data)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete data[key];
      } else if (typeof data[key] === "object") {
        clean(data[key]);
      }
    }
  };

  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);

  next();
};

/**
 * Validates email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

module.exports = {
  isValidObjectId,
  validateIdParam,
  sanitizeNoSql,
  isValidEmail,
};
