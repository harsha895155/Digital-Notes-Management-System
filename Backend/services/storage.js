const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary if environment variables are present
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("Cloudinary Storage configured successfully.");
} else {
  console.warn(
    "Warning: Cloudinary credentials not detected. Falling back to local storage for development."
  );
}

// Ensure local uploads directory exists for dev fallback
const localUploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(localUploadsDir)) {
  try {
    fs.mkdirSync(localUploadsDir, { recursive: true });
  } catch (err) {
    console.error("Could not create local uploads folder:", err);
  }
}

// Configurable constants
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // in bytes

// Allowed extensions and corresponding MIME patterns
const ALLOWED_EXTENSIONS = new Set([
  // PDF
  ".pdf",
  // Documents
  ".doc", ".docx", ".txt",
  // Images
  ".png", ".jpg", ".jpeg", ".webp",
  // Spreadsheets
  ".xls", ".xlsx", ".csv",
  // Presentations
  ".ppt", ".pptx",
  // Archives
  ".zip"
]);

// Explicitly blocked executable / dangerous extensions
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".bin", ".vbs", ".js", ".mjs",
  ".msi", ".com", ".scr", ".pif", ".jar", ".app", ".dmg", ".py", ".pl", ".php"
]);

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "text/plain",
  "text/csv",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip"
];

// File filter function for Multer
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File type ${ext} is executable and strictly prohibited for security.`), false);
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported file extension ${ext}. Allowed formats: PDF, Word, Excel, PowerPoint, Text, Images (PNG, JPG, WebP), CSV, and ZIP.`), false);
  }

  const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
    file.mimetype.startsWith(prefix)
  );

  if (!isMimeAllowed) {
    return cb(new Error(`Invalid MIME type (${file.mimetype}) for file ${file.originalname}.`), false);
  }

  cb(null, true);
};

// Use memory storage for direct streaming to Cloudinary or disk write
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max 10 files per upload request
  },
  fileFilter,
});

/**
 * Upload a single file buffer to storage (Cloudinary or local dev fallback)
 * @param {Object} file - Multer file object
 * @param {string} userEmail - Owner email for namespacing
 * @returns {Promise<Object>} Attachment metadata
 */
const uploadFileToStorage = async (file, userEmail) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueKey = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${baseName}`;
  const isImage = file.mimetype.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: `minddesk_notes/${userEmail.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        public_id: uniqueKey,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
      };

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(new Error("Cloud storage upload failed: " + error.message));
          }

          resolve({
            originalName: file.originalname,
            storageKey: result.public_id,
            url: result.secure_url,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
            storageProvider: "cloudinary",
            resourceType: result.resource_type || resourceType,
            userEmail,
          });
        }
      );

      stream.end(file.buffer);
    });
  } else {
    // Local development fallback
    const fileName = `${uniqueKey}${ext}`;
    const filePath = path.join(localUploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return {
      originalName: file.originalname,
      storageKey: fileName,
      url: `/uploads/${fileName}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      storageProvider: "local",
      resourceType,
      userEmail,
    };
  }
};

/**
 * Delete a file from storage
 * @param {string} storageKey - Stored object identifier
 * @param {string} storageProvider - Provider name (cloudinary or local)
 * @param {string} resourceType - Resource type (image, raw, etc.)
 */
const deleteFileFromStorage = async (storageKey, storageProvider = "cloudinary", resourceType = "auto") => {
  if (storageProvider === "cloudinary" && isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: resourceType || "auto",
        invalidate: true,
      });
      // Also attempt raw deletion if image attempt fails for document formats
      if (resourceType !== "raw") {
        await cloudinary.uploader.destroy(storageKey, {
          resource_type: "raw",
          invalidate: true,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to delete object from Cloudinary:", err);
    }
  } else {
    // Delete local file
    try {
      const filePath = path.join(localUploadsDir, storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Failed to delete local fallback file:", err);
    }
  }
};

module.exports = {
  upload,
  uploadFileToStorage,
  deleteFileFromStorage,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ALLOWED_EXTENSIONS,
  isCloudinaryConfigured,
  localUploadsDir,
};
