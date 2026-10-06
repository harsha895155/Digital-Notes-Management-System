const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS, 10) || 7;

/**
 * Generate a short-lived access token
 */
const generateAccessToken = (user) => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
    },
    secret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
};

/**
 * Generate a cryptographically secure random refresh token and persist in DB
 */
const generateRefreshToken = async (user, meta = {}) => {
  const tokenString = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  const refreshToken = await RefreshToken.create({
    token: tokenString,
    userId: user._id || user.id,
    userEmail: user.email,
    expiresAt,
    userAgent: meta.userAgent || "",
    ipAddress: meta.ipAddress || "",
  });

  return refreshToken.token;
};

/**
 * Generate both access and refresh token pair
 */
const generateTokenPair = async (user, meta = {}) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user, meta);
  return { accessToken, refreshToken };
};

/**
 * Rotate refresh token: validate old token, revoke it, and return a fresh token pair
 */
const rotateRefreshToken = async (oldTokenString, meta = {}) => {
  if (!oldTokenString) {
    throw new Error("Refresh token is required");
  }

  const existingToken = await RefreshToken.findOne({ token: oldTokenString });
  if (!existingToken) {
    throw new Error("Invalid refresh token");
  }

  // Token reuse detection (compromise security)
  if (existingToken.revoked) {
    // Revoke all tokens for this user as a safeguard
    await RefreshToken.updateMany(
      { userId: existingToken.userId },
      { $set: { revoked: true, revokedAt: new Date() } }
    );
    throw new Error("Refresh token reuse detected. All sessions revoked.");
  }

  if (new Date() > existingToken.expiresAt) {
    throw new Error("Refresh token has expired");
  }

  // Mark old token as revoked and replaced
  const newTokenString = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  existingToken.revoked = true;
  existingToken.revokedAt = new Date();
  existingToken.replacedByToken = newTokenString;
  await existingToken.save();

  // Create new refresh token
  await RefreshToken.create({
    token: newTokenString,
    userId: existingToken.userId,
    userEmail: existingToken.userEmail,
    expiresAt,
    userAgent: meta.userAgent || existingToken.userAgent,
    ipAddress: meta.ipAddress || existingToken.ipAddress,
  });

  // Generate fresh access token
  const accessToken = generateAccessToken({
    id: existingToken.userId,
    email: existingToken.userEmail,
  });

  return {
    accessToken,
    refreshToken: newTokenString,
    userId: existingToken.userId,
    userEmail: existingToken.userEmail,
  };
};

/**
 * Revoke a single refresh token (e.g. on logout)
 */
const revokeRefreshToken = async (tokenString) => {
  if (!tokenString) return false;
  const res = await RefreshToken.updateOne(
    { token: tokenString },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
  return res.modifiedCount > 0;
};

/**
 * Revoke all active sessions for a user (e.g. on password reset)
 */
const revokeAllUserTokens = async (userId) => {
  if (!userId) return false;
  await RefreshToken.updateMany(
    { userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
  return true;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
