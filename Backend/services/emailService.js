const crypto = require("crypto");
const PasswordResetToken = require("../models/PasswordResetToken");

const RESET_TOKEN_EXPIRY_MINUTES = 60; // 1 hour

/**
 * Hash raw token using SHA-256
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generate secure single-use password reset token
 */
const createPasswordResetToken = async (user) => {
  // Invalidate any existing unused reset tokens for this user
  await PasswordResetToken.updateMany(
    { userId: user._id || user.id, used: false },
    { $set: { used: true, usedAt: new Date() } }
  );

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

  await PasswordResetToken.create({
    tokenHash,
    userId: user._id || user.id,
    userEmail: user.email,
    expiresAt,
  });

  return rawToken;
};

/**
 * Verify a password reset token
 */
const verifyPasswordResetToken = async (rawToken, email) => {
  if (!rawToken) {
    throw new Error("Reset token is required");
  }

  const tokenHash = hashToken(rawToken);
  const query = { tokenHash };
  if (email) {
    query.userEmail = email.toLowerCase().trim();
  }

  const resetRecord = await PasswordResetToken.findOne(query);

  if (!resetRecord) {
    throw new Error("Invalid or expired password reset token");
  }

  if (resetRecord.used) {
    throw new Error("This password reset token has already been used");
  }

  if (new Date() > resetRecord.expiresAt) {
    throw new Error("Password reset token has expired. Please request a new one.");
  }

  return resetRecord;
};

/**
 * Send password reset email (handles both SMTP and safe fallback)
 */
const sendPasswordResetEmail = async ({ email, rawToken, req }) => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    (req && req.headers.origin) ||
    "https://digital-notes-management-system.vercel.app";

  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
    email
  )}`;

  // If SMTP environment variables are configured, attempt transport
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"MindDesk Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Your MindDesk Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ebd8c8; border-radius: 12px; background: #fffdf8;">
            <h2 style="color: #24160f; margin-bottom: 8px;">MindDesk Password Reset</h2>
            <p style="color: #666; font-size: 15px;">You requested a password reset for your MindDesk account. Click the button below to choose a new password.</p>
            <div style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #8B4F27; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #888; font-size: 13px;">This link will expire in 60 minutes. If you did not request this, you can safely ignore this email.</p>
            <p style="color: #aaa; font-size: 12px; word-break: break-all;">Link: ${resetUrl}</p>
          </div>
        `,
      });
      return { success: true, method: "smtp" };
    } catch (err) {
      console.error("SMTP sending error, falling back to secure log:", err.message);
    }
  }

  // Fallback for development/testing without real SMTP configured
  console.log(`[MindDesk Auth] Password reset link for ${email}: ${resetUrl}`);
  return { success: true, method: "fallback", resetUrl };
};

module.exports = {
  createPasswordResetToken,
  verifyPasswordResetToken,
  sendPasswordResetEmail,
  hashToken,
};
