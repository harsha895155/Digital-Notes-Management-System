const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Models
const User = require("./models/User");
const Note = require("./models/Note");
const Category = require("./models/Category");
const Todo = require("./models/Todo");
const Notification = require("./models/Notification");
const RefreshToken = require("./models/RefreshToken");
const PasswordResetToken = require("./models/PasswordResetToken");

// Middleware & Services
const authMiddleware = require("./middleware/auth");
const { verifyEmailOwnership } = require("./middleware/auth");
const { authLimiter, passwordResetLimiter, aiLimiter, apiLimiter } = require("./middleware/rateLimiter");
const { validateIdParam, sanitizeNoSql, isValidEmail } = require("./middleware/validate");
const tokenService = require("./services/tokenService");
const emailService = require("./services/emailService");
const aiService = require("./services/aiService");
const { upload, uploadFileToStorage, deleteFileFromStorage } = require("./services/storage");
const attachmentRoutes = require("./routes/attachments");

const app = express();
app.set("trust proxy", 1);

// ==================== CORS CONFIGURATION (Phase 5) ====================
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://digital-notes-management-system.vercel.app",
];

const envAllowed = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const originsWhitelist = [...new Set([...defaultAllowedOrigins, ...envAllowed])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile applications, curl, server-to-server)
      if (!origin) return callback(null, true);

      // In non-production, allow localhost and 127.0.0.1 on any port
      if (
        process.env.NODE_ENV !== "production" &&
        (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }

      // Check whitelist or Vercel preview domain pattern
      if (originsWhitelist.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use(sanitizeNoSql);

// Serve local fallback uploads statically if in local development
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==================== MONGODB CONNECTION ====================
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGO_URI) {
    console.error("Warning: MONGO_URI is not set in environment variables");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Cloud Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed", error);
  }
};

if (process.env.MONGO_URI) {
  connectDB();
}

app.use(async (req, res, next) => {
  if (mongoose.connection.readyState < 1 && process.env.MONGO_URI) {
    await connectDB();
  }
  next();
});

// Helper to serialize user info safely without sensitive fields
const getSafeUserData = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  username: user.username || "",
  phone: user.phone || "",
  bio: user.bio || "",
  profileImage: user.profileImage || "",
  status: user.status || "active",
  createdAt: user.createdAt,
});

// Helper to set refresh token in HTTP-only secure cookie
const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
};

// ==================== HEALTH & ROOT ====================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "MindDesk Production API Running",
    status: "ok",
    version: "2.0.0",
  });
});

// Attachment endpoints
app.use("/api", attachmentRoutes);

// ==================== AUTHENTICATION & SESSION MANAGEMENT ====================

// POST /api/register
app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration Successful",
      user: getSafeUserData(newUser),
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration Failed",
      error: error.message,
    });
  }
});

// POST /api/login (Phase 3 Access + Refresh Tokens)
app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).lean();

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Generate Access + Refresh token pair
    const meta = {
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || req.connection.remoteAddress || "",
    };

    const { accessToken, refreshToken } = await tokenService.generateTokenPair(user, meta);

    // Set secure HTTP-only cookie
    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      message: "Login Successful",
      token: accessToken, // for backward compatibility with existing frontend
      accessToken,
      refreshToken, // returned for mobile and offline clients
      user: getSafeUserData(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Login Failed",
      error: error.message,
    });
  }
});

// POST /api/auth/refresh (Phase 3 Refresh Token Rotation)
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const incomingToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!incomingToken) {
      return res.status(401).json({ message: "Refresh token is missing." });
    }

    const meta = {
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || req.connection.remoteAddress || "",
    };

    const { accessToken, refreshToken, userId, userEmail } = await tokenService.rotateRefreshToken(
      incomingToken,
      meta
    );

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      message: "Token refreshed successfully",
      token: accessToken,
      accessToken,
      refreshToken,
      user: { id: userId, email: userEmail },
    });
  } catch (error) {
    res.status(401).json({
      message: error.message || "Failed to refresh authentication session.",
    });
  }
});

// POST /api/auth/logout (Phase 3 Revocation)
app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (token) {
      await tokenService.revokeRefreshToken(token);
    }

    res.clearCookie("refreshToken", { path: "/" });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
});

// POST /api/auth/forgot-password (Phase 4)
app.post("/api/auth/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Security requirement: Never reveal whether an email exists
    if (user) {
      const rawToken = await emailService.createPasswordResetToken(user);
      await emailService.sendPasswordResetEmail({
        email: normalizedEmail,
        rawToken,
        req,
      });
    }

    res.status(200).json({
      message: "If an account with that email exists, password reset instructions have been sent.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to process password reset request at this time.",
      error: error.message,
    });
  }
});

// POST /api/auth/reset-password (Phase 4)
app.post("/api/auth/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const resetRecord = await emailService.verifyPasswordResetToken(token, email);
    const user = await User.findById(resetRecord.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Mark reset token used
    resetRecord.used = true;
    resetRecord.usedAt = new Date();
    await resetRecord.save();

    // Invalidate all active sessions across devices
    await tokenService.revokeAllUserTokens(user._id);

    res.status(200).json({
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to reset password.",
    });
  }
});

// PUT /api/change-password
// PUT /api/change-password
app.put("/api/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    // Determine target user by token or email
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch {
        // Token invalid or expired, fallback to email
      }
    }

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    // If current password provided, verify it
    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password." });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Invalidate sessions across devices
    await tokenService.revokeAllUserTokens(user._id);

    res.status(200).json({ message: "Password updated successfully! You can now log in with your new password." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update password", error: error.message });
  }
});

// ==================== USER PROFILE ====================

app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const totalNotes = await Note.countDocuments({ userEmail: user.email });
    const distinctCategories = await Note.distinct("category", { userEmail: user.email });
    const today = new Date().toISOString().split("T")[0];
    const todayTasks = await Todo.countDocuments({ userEmail: user.email, taskDate: today });
    const completedTasks = await Todo.countDocuments({ userEmail: user.email, taskDate: today, completed: true });

    const now = new Date();
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Note.countDocuments({
      userEmail: user.email,
      deadline: { $gte: now, $lte: inFiveDays },
    });

    res.status(200).json({
      user: getSafeUserData(user),
      stats: {
        totalNotes,
        categories: distinctCategories.length,
        todayTasks,
        completedTasks,
        upcomingDeadlines,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
});

app.put("/api/profile", authMiddleware, async (req, res) => {
  try {
    const { fullName, username, phone, bio } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName) user.fullName = fullName.trim();
    if (username !== undefined) user.username = username.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();

    await user.save();
    res.status(200).json({
      message: "Profile updated successfully",
      user: getSafeUserData(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

app.delete("/api/profile/avatar", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profileImageStorageKey) {
      await deleteFileFromStorage(user.profileImageStorageKey, user.profileImageProvider, "image");
    }

    user.profileImage = "";
    user.profileImageStorageKey = "";
    user.profileImageProvider = "";
    await user.save();

    res.status(200).json({ message: "Avatar removed successfully", user: getSafeUserData(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete avatar", error: error.message });
  }
});

// ==================== NOTES CRUD & SHARING (Phases 1, 2, 11, 12, 13, 14) ====================

// GET /api/notes (Protected by JWT, enforces ownership + returns shared notes)
app.get("/api/notes", authMiddleware, async (req, res) => {
  try {
    const { category, tag, folder } = req.query;
    const filter = {
      $or: [
        { userEmail: req.user.email },
        { "shares.userEmail": req.user.email },
      ],
    };

    if (category && category !== "All Notes") {
      filter.category = category;
    }
    if (tag) {
      filter.tags = tag;
    }
    if (folder) {
      filter.folder = folder === "__general__" ? "" : folder;
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notes", error: error.message });
  }
});

// GET /api/notes/:email (Protected by JWT with verifyEmailOwnership)
app.get("/api/notes/:email", authMiddleware, verifyEmailOwnership, async (req, res) => {
  try {
    const notes = await Note.find({
      $or: [
        { userEmail: req.user.email },
        { "shares.userEmail": req.user.email },
      ],
    }).sort({ createdAt: -1 }).lean();
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notes", error: error.message });
  }
});

// GET /api/notes/detail/:id (Protected with Ownership / Shared check)
app.get("/api/notes/detail/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.userEmail === req.user.email;
    const share = (note.shares || []).find((s) => s.userEmail === req.user.email);

    if (!isOwner && !share) {
      return res.status(403).json({ message: "Access denied. You do not have permission to view this note." });
    }

    res.status(200).json({
      note,
      permission: isOwner ? "owner" : share.permission,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load note", error: error.message });
  }
});

// POST /api/notes (Protected by JWT, assigns userEmail from token)
app.post("/api/notes", authMiddleware, async (req, res) => {
  try {
    const { title, description, category, folder, deadline, attachments, tags } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: "Title, content, and category are required." });
    }

    const note = await Note.create({
      title: title.trim(),
      description,
      category: category.trim(),
      folder: folder ? folder.trim() : "",
      deadline: deadline || null,
      userEmail: req.user.email, // Derived securely from JWT
      attachments: attachments || [],
      tags: Array.isArray(tags) ? tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean) : [],
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to create note", error: error.message });
  }
});

// PUT /api/notes/:id (Protected by JWT, checks Owner or Editor permission)
app.put("/api/notes/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.userEmail === req.user.email;
    const share = (note.shares || []).find((s) => s.userEmail === req.user.email);
    const isEditor = share && share.permission === "editor";

    if (!isOwner && !isEditor) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to edit this note." });
    }

    const { title, description, category, folder, deadline, attachments, tags, reminderTime, reminderMinutesBefore } = req.body;

    if (title) note.title = title.trim();
    if (description !== undefined) note.description = description;
    if (category) note.category = category.trim();
    if (folder !== undefined) note.folder = folder.trim();
    if (deadline !== undefined) note.deadline = deadline || null;
    if (attachments !== undefined) note.attachments = attachments;
    if (tags !== undefined && Array.isArray(tags)) {
      note.tags = tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    }
    if (reminderTime !== undefined) {
      note.reminderTime = reminderTime || null;
      note.reminderSent = false;
    }
    if (reminderMinutesBefore !== undefined) {
      note.reminderMinutesBefore = reminderMinutesBefore;
    }

    // Record activity if edited by collaborator
    if (!isOwner) {
      note.activity.push({
        action: `Edited note`,
        userEmail: req.user.email,
        timestamp: new Date(),
      });
    }

    await note.save();
    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to update note", error: error.message });
  }
});

// DELETE /api/notes/:id (Protected by JWT, only Owner can delete)
app.delete("/api/notes/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: Only the owner can delete this note." });
    }

    // Clean up attachments
    if (note.attachments && note.attachments.length > 0) {
      for (const att of note.attachments) {
        await deleteFileFromStorage(att.storageKey, att.storageProvider, att.resourceType);
      }
    }

    await Note.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete note", error: error.message });
  }
});

// POST /api/notes/:id/share (Phase 13 Share Note with User)
app.post("/api/notes/:id/share", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const { targetEmail, permission = "viewer" } = req.body;
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return res.status(400).json({ message: "Valid target user email is required." });
    }

    const normalizedTarget = targetEmail.toLowerCase().trim();
    if (normalizedTarget === req.user.email) {
      return res.status(400).json({ message: "You cannot share a note with yourself." });
    }

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (note.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: Only the owner can manage sharing permissions." });
    }

    // Verify target user exists
    const targetUser = await User.findOne({ email: normalizedTarget });
    if (!targetUser) {
      return res.status(404).json({ message: "User with this email was not found on MindDesk." });
    }

    // Check if already shared
    const existingIndex = (note.shares || []).findIndex((s) => s.userEmail === normalizedTarget);
    if (existingIndex >= 0) {
      note.shares[existingIndex].permission = permission;
    } else {
      note.shares.push({
        userEmail: normalizedTarget,
        permission,
        sharedAt: new Date(),
      });
      note.isShared = true;
    }

    note.activity.push({
      action: `Shared with ${normalizedTarget} as ${permission}`,
      userEmail: req.user.email,
      timestamp: new Date(),
    });

    await note.save();

    // Create notification for target user
    await Notification.create({
      userEmail: normalizedTarget,
      title: "Note Shared With You",
      message: `${req.user.email} shared note "${note.title}" with you as ${permission}.`,
      type: "share",
      referenceId: String(note._id),
      referenceType: "note",
    });

    res.status(200).json({
      message: `Note successfully shared with ${normalizedTarget}.`,
      shares: note.shares,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to share note", error: error.message });
  }
});

// DELETE /api/notes/:id/share/:email (Phase 13 Revoke or Leave Share)
app.delete("/api/notes/:id/share/:email", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const targetEmail = req.params.email.toLowerCase().trim();
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    const isOwner = note.userEmail === req.user.email;
    const isSelfLeaving = targetEmail === req.user.email;

    if (!isOwner && !isSelfLeaving) {
      return res.status(403).json({ message: "Forbidden: Cannot revoke this share." });
    }

    note.shares = (note.shares || []).filter((s) => s.userEmail !== targetEmail);
    if (note.shares.length === 0) {
      note.isShared = false;
    }

    note.activity.push({
      action: isSelfLeaving ? `Left shared note` : `Removed ${targetEmail}'s access`,
      userEmail: req.user.email,
      timestamp: new Date(),
    });

    await note.save();
    res.status(200).json({ message: "Share revoked successfully", shares: note.shares });
  } catch (error) {
    res.status(500).json({ message: "Failed to revoke share", error: error.message });
  }
});

// ==================== CATEGORIES CRUD (Phases 1, 2) ====================

app.get("/api/categories", authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find({ userEmail: req.user.email }).lean();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error: error.message });
  }
});

app.get("/api/categories/:email", authMiddleware, verifyEmailOwnership, async (req, res) => {
  try {
    const categories = await Category.find({ userEmail: req.user.email }).lean();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error: error.message });
  }
});

app.post("/api/categories", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const trimmed = name.trim();
    const exists = await Category.findOne({
      userEmail: req.user.email,
      name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (exists) {
      return res.status(400).json({ message: `A category named "${trimmed}" already exists.` });
    }

    const category = await Category.create({
      name: trimmed,
      userEmail: req.user.email, // Derived securely from JWT
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to create category", error: error.message });
  }
});

app.put("/api/categories/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: You do not own this category." });
    }

    const oldName = category.name;
    const newName = name.trim();

    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const exists = await Category.findOne({
        userEmail: req.user.email,
        name: { $regex: new RegExp(`^${newName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        _id: { $ne: category._id },
      });
      if (exists) {
        return res.status(400).json({ message: `A category named "${newName}" already exists.` });
      }
    }

    category.name = newName;
    await category.save();

    // Cascade update to notes
    if (oldName !== newName) {
      await Note.updateMany(
        { category: oldName, userEmail: req.user.email },
        { $set: { category: newName } }
      );
    }

    res.status(200).json({ message: "Category updated successfully", category });
  } catch (error) {
    res.status(500).json({ message: "Failed to update category", error: error.message });
  }
});

app.post("/api/categories/:id/folders", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category.userEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });

    const trimmed = name.trim();
    const exists = (category.folders || []).some((f) => f.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: `Folder "${trimmed}" already exists in this category` });
    }

    category.folders.push({ name: trimmed });
    await category.save();

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to create folder", error: error.message });
  }
});

app.delete("/api/categories/:id/folders/:folderId", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category.userEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });

    const folder = category.folders.id(req.params.folderId);
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    const folderName = folder.name;
    category.folders.pull({ _id: req.params.folderId });
    await category.save();

    // Reset notes in this folder to root category
    await Note.updateMany(
      { category: category.name, folder: folderName, userEmail: req.user.email },
      { $set: { folder: "" } }
    );

    res.status(200).json({ message: `Folder "${folderName}" deleted`, category });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete folder", error: error.message });
  }
});

app.delete("/api/categories/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category.userEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });

    const categoryNotes = await Note.find({
      category: category.name,
      userEmail: req.user.email,
    });

    for (const note of categoryNotes) {
      if (note.attachments && note.attachments.length > 0) {
        for (const att of note.attachments) {
          await deleteFileFromStorage(att.storageKey, att.storageProvider, att.resourceType);
        }
      }
    }

    await Note.deleteMany({ category: category.name, userEmail: req.user.email });
    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: `Category deleted with ${categoryNotes.length} notes` });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category", error: error.message });
  }
});

// ==================== TODOS CRUD (Phases 1, 2) ====================

app.post("/api/todos", authMiddleware, async (req, res) => {
  try {
    const { task, taskDate } = req.body;
    if (!task || !task.trim()) {
      return res.status(400).json({ message: "Task description is required" });
    }

    const todo = await Todo.create({
      task: task.trim(),
      userEmail: req.user.email, // Derived securely from JWT
      taskDate: taskDate || new Date().toISOString().split("T")[0],
    });

    res.status(201).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to create todo", error: error.message });
  }
});

app.get("/api/todos", authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todos = await Todo.find({
      userEmail: req.user.email,
      taskDate: req.query.date || today,
    });
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch todos", error: error.message });
  }
});

app.get("/api/todos/:email", authMiddleware, verifyEmailOwnership, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todos = await Todo.find({
      userEmail: req.user.email,
      taskDate: req.query.date || today,
    });
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch todos", error: error.message });
  }
});

app.put("/api/todos/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    if (todo.userEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });

    if (req.body.task !== undefined) todo.task = req.body.task.trim();
    if (req.body.completed !== undefined) {
      todo.completed = Boolean(req.body.completed);
    } else {
      todo.completed = !todo.completed;
    }

    await todo.save();
    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to update todo", error: error.message });
  }
});

app.delete("/api/todos/:id", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    if (todo.userEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });

    await Todo.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Todo deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete todo", error: error.message });
  }
});

// ==================== GLOBAL SERVER-SIDE SEARCH (Phase 10) ====================
app.get("/api/search", authMiddleware, async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.status(200).json({ notes: [], categories: [], todos: [] });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [matchingNotes, matchingCategories, matchingTodos] = await Promise.all([
      Note.find({
        $and: [
          {
            $or: [
              { userEmail: req.user.email },
              { "shares.userEmail": req.user.email },
            ],
          },
          {
            $or: [
              { title: regex },
              { description: regex },
              { category: regex },
              { folder: regex },
              { tags: regex },
            ],
          },
        ],
      })
        .sort({ updatedAt: -1 })
        .limit(25),

      Category.find({
        userEmail: req.user.email,
        name: regex,
      }).limit(10),

      Todo.find({
        userEmail: req.user.email,
        task: regex,
      }).limit(15),
    ]);

    res.status(200).json({
      query,
      notes: matchingNotes,
      categories: matchingCategories,
      todos: matchingTodos,
      totalCount: matchingNotes.length + matchingCategories.length + matchingTodos.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
});

// ==================== TAGS (Phase 12) ====================
app.get("/api/tags", authMiddleware, async (req, res) => {
  try {
    const distinctTags = await Note.distinct("tags", {
      $or: [
        { userEmail: req.user.email },
        { "shares.userEmail": req.user.email },
      ],
    });

    const counts = {};
    const notesWithTags = await Note.find(
      { userEmail: req.user.email, "tags.0": { $exists: true } },
      "tags"
    );

    for (const note of notesWithTags) {
      for (const t of note.tags || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }

    const tagsWithCounts = distinctTags.filter(Boolean).map((t) => ({
      name: t,
      count: counts[t] || 0,
    }));

    res.status(200).json(tagsWithCounts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tags", error: error.message });
  }
});

// ==================== AI NOTE SUMMARIES (Phases 15 & 16) ====================
app.post("/api/ai/summarize", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { content, title, summaryType = "short" } = req.body;

    if (!content || typeof content !== "string" || content.trim().length < 15) {
      return res.status(400).json({
        message: "Note content must be at least 15 characters to generate a summary.",
      });
    }

    const result = await aiService.generateNoteSummary(content, title || "Untitled Note", summaryType);

    res.status(200).json({
      message: "Summary generated successfully",
      summary: result.summary,
      summaryType: result.summaryType,
      provider: result.provider,
      generatedAt: result.generatedAt,
      notice: "AI summaries are generated upon explicit request and processed securely.",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to generate AI summary.",
    });
  }
});

// ==================== NOTIFICATIONS & REMINDERS (Phases 8 & 9) ====================
app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userEmail: req.user.email,
      isRead: false,
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

app.put("/api/notifications/:id/read", authMiddleware, validateIdParam("id"), async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userEmail: req.user.email },
      { $set: { isRead: true } },
      { new: true }
    );
    res.status(200).json(notif);
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notification as read", error: error.message });
  }
});

app.put("/api/notifications/mark-all-read", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userEmail: req.user.email }, { $set: { isRead: true } });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications", error: error.message });
  }
});

// ==================== CENTRALIZED ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "An internal server error occurred."
      : err.message || "Server Error";

  res.status(status).json({ message });
});

// ==================== SERVER LISTEN ====================
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`MindDesk Server running on port ${PORT}`);
  });
}

module.exports = app;