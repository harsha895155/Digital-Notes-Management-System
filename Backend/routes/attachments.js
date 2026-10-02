const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

const authMiddleware = require("../middleware/auth");
const Note = require("../models/Note");
const Todo = require("../models/Todo");
const {
  upload,
  uploadFileToStorage,
  deleteFileFromStorage,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ALLOWED_EXTENSIONS,
  isCloudinaryConfigured,
  localUploadsDir,
} = require("../services/storage");

/**
 * Helper to handle Multer errors cleanly
 */
const handleUploadMiddleware = (req, res, next) => {
  upload.array("files", 10)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB.`,
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          message: "You can upload a maximum of 10 files at once.",
        });
      }
      return res.status(400).json({
        message: err.message || "File upload validation failed.",
      });
    }
    next();
  });
};

// ==================== CONFIGURATION ENDPOINT ====================

/**
 * GET /api/attachments/config
 * Returns client-side upload constraints
 */
router.get("/attachments/config", (req, res) => {
  res.status(200).json({
    maxFileSizeMB: MAX_FILE_SIZE_MB,
    maxFileSizeBytes: MAX_FILE_SIZE,
    allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
    isCloudinaryConfigured,
  });
});

// ==================== DIRECT MULTI-FILE UPLOAD (FOR NOTE CREATION) ====================

/**
 * POST /api/upload
 * Uploads files and returns metadata array to be attached to a new note/task
 */
router.post("/upload", authMiddleware, handleUploadMiddleware, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were selected for upload." });
    }

    const uploadedAttachments = [];
    const userEmail = req.user.email;

    try {
      for (const file of req.files) {
        const metadata = await uploadFileToStorage(file, userEmail);
        uploadedAttachments.push(metadata);
      }
    } catch (uploadErr) {
      // Cleanup any already uploaded files in this batch on partial failure
      for (const item of uploadedAttachments) {
        await deleteFileFromStorage(item.storageKey, item.storageProvider, item.resourceType);
      }
      throw uploadErr;
    }

    res.status(200).json({
      message: `${uploadedAttachments.length} file(s) uploaded successfully.`,
      attachments: uploadedAttachments,
    });
  } catch (error) {
    console.error("Batch upload failed:", error);
    res.status(500).json({
      message: "Failed to process file uploads.",
      error: error.message,
    });
  }
});

// ==================== NOTE ATTACHMENTS ====================

/**
 * POST /api/notes/:id/attachments
 * Upload and attach files to an existing note
 */
router.post(
  "/notes/:id/attachments",
  authMiddleware,
  handleUploadMiddleware,
  async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);

      if (!note) {
        return res.status(404).json({ message: "Note not found." });
      }

      // Ownership verification
      if (note.userEmail !== req.user.email) {
        return res.status(403).json({
          message: "Forbidden: You do not have permission to modify this note.",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const newAttachments = [];
      try {
        for (const file of req.files) {
          const metadata = await uploadFileToStorage(file, req.user.email);
          newAttachments.push(metadata);
        }
      } catch (uploadErr) {
        for (const item of newAttachments) {
          await deleteFileFromStorage(item.storageKey, item.storageProvider, item.resourceType);
        }
        throw uploadErr;
      }

      note.attachments.push(...newAttachments);
      await note.save();

      res.status(200).json({
        message: "Attachments added successfully.",
        attachments: note.attachments,
        addedCount: newAttachments.length,
      });
    } catch (error) {
      console.error("Add note attachment error:", error);
      res.status(500).json({
        message: "Failed to attach files to note.",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/notes/:id/attachments
 * List attachments for a note
 */
router.get("/notes/:id/attachments", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }

    if (note.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden." });
    }

    res.status(200).json({
      attachments: note.attachments || [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch attachments.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/notes/:id/attachments/:attachmentId
 * Permanently remove an attachment from a note and delete its cloud file
 */
router.delete("/notes/:id/attachments/:attachmentId", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }

    if (note.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: Access denied." });
    }

    const attachmentIndex = note.attachments.findIndex(
      (a) => a._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ message: "Attachment not found on this note." });
    }

    const [attachment] = note.attachments.splice(attachmentIndex, 1);

    // Delete object from storage
    await deleteFileFromStorage(
      attachment.storageKey,
      attachment.storageProvider,
      attachment.resourceType
    );

    await note.save();

    res.status(200).json({
      message: "Attachment removed successfully.",
      attachmentId: req.params.attachmentId,
      remainingCount: note.attachments.length,
    });
  } catch (error) {
    console.error("Delete note attachment error:", error);
    res.status(500).json({
      message: "Failed to delete attachment.",
      error: error.message,
    });
  }
});

// ==================== TASK / TODO ATTACHMENTS ====================

/**
 * POST /api/todos/:id/attachments
 * Upload and attach files to an existing todo task
 */
router.post(
  "/todos/:id/attachments",
  authMiddleware,
  handleUploadMiddleware,
  async (req, res) => {
    try {
      const todo = await Todo.findById(req.params.id);

      if (!todo) {
        return res.status(404).json({ message: "Task not found." });
      }

      if (todo.userEmail !== req.user.email) {
        return res.status(403).json({ message: "Forbidden." });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded." });
      }

      const newAttachments = [];
      try {
        for (const file of req.files) {
          const metadata = await uploadFileToStorage(file, req.user.email);
          newAttachments.push(metadata);
        }
      } catch (err) {
        for (const item of newAttachments) {
          await deleteFileFromStorage(item.storageKey, item.storageProvider, item.resourceType);
        }
        throw err;
      }

      if (!todo.attachments) todo.attachments = [];
      todo.attachments.push(...newAttachments);
      await todo.save();

      res.status(200).json({
        message: "Task attachments added successfully.",
        attachments: todo.attachments,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to attach files to task.",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/todos/:id/attachments/:attachmentId
 * Delete a file attachment from a todo task
 */
router.delete("/todos/:id/attachments/:attachmentId", authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (todo.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden." });
    }

    const attachmentIndex = (todo.attachments || []).findIndex(
      (a) => a._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ message: "Attachment not found." });
    }

    const [attachment] = todo.attachments.splice(attachmentIndex, 1);

    await deleteFileFromStorage(
      attachment.storageKey,
      attachment.storageProvider,
      attachment.resourceType
    );

    await todo.save();

    res.status(200).json({
      message: "Task attachment deleted successfully.",
      attachmentId: req.params.attachmentId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete task attachment.",
      error: error.message,
    });
  }
});

// ==================== AUTHENTICATED DOWNLOAD / PROXY ENDPOINT ====================

/**
 * GET /api/attachments/:attachmentId/download
 * Securely stream or redirect the file for download with original filename
 */
router.get("/attachments/:attachmentId/download", authMiddleware, async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;

    // Search in Note attachments
    let note = await Note.findOne({ "attachments._id": attachmentId });
    let attachment = null;

    if (note) {
      if (note.userEmail !== req.user.email) {
        return res.status(403).json({ message: "Forbidden: Access denied to this file." });
      }
      attachment = note.attachments.id(attachmentId);
    } else {
      // Check in Todo attachments
      const todo = await Todo.findOne({ "attachments._id": attachmentId });
      if (todo) {
        if (todo.userEmail !== req.user.email) {
          return res.status(403).json({ message: "Forbidden: Access denied to this file." });
        }
        attachment = todo.attachments.id(attachmentId);
      }
    }

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found." });
    }

    // Set appropriate download headers
    const safeName = attachment.originalName.replace(/[^\w\.\-\s]/gi, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeName)}"`);
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");

    if (attachment.storageProvider === "local") {
      const filePath = path.join(localUploadsDir, attachment.storageKey);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File missing on storage." });
      }
      return res.sendFile(filePath);
    }

    // Cloudinary download: fetch and pipe stream to client
    const remoteUrl = attachment.url;
    const client = remoteUrl.startsWith("https") ? https : http;

    client.get(remoteUrl, (streamResponse) => {
      if (streamResponse.statusCode >= 400) {
        return res.status(streamResponse.statusCode).json({
          message: "Failed to retrieve file from cloud storage.",
        });
      }
      streamResponse.pipe(res);
    }).on("error", (err) => {
      console.error("Streaming error from cloud storage:", err);
      res.status(500).json({ message: "Error downloading file from storage." });
    });
  } catch (error) {
    console.error("Download endpoint error:", error);
    res.status(500).json({
      message: "Download failed.",
      error: error.message,
    });
  }
});

module.exports = router;
