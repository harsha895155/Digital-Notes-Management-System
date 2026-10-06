const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for sensitive authentication endpoints (Login, Register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

/**
 * Strict limiter for password recovery endpoints
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 reset attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many password reset requests. Please try again later.",
  },
});

/**
 * Limiter for AI summarization calls
 */
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 25, // Limit each IP to 25 AI requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "AI generation rate limit reached. Please wait a few moments before trying again.",
  },
});

/**
 * General API rate limiter for overall service stability
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  aiLimiter,
  apiLimiter,
};
