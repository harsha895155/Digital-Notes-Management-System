import axios from "axios";
import API_BASE_URL, { getAuthHeaders, getAuthToken } from "../api/config";

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get file extension from filename (lowercase with dot, e.g. '.pdf')
 */
export const getFileExtension = (filename = "") => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
};

/**
 * Icon, color, and label metadata for common file types
 */
export const getFileInfo = (attachment = {}) => {
  const name = attachment.originalName || attachment.name || "";
  const ext = getFileExtension(name);
  const mime = (attachment.mimeType || attachment.type || "").toLowerCase();

  // Images
  if (
    mime.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext)
  ) {
    return {
      type: "Image",
      icon: "bi-file-earmark-image-fill",
      color: "#c07736",
      bg: "rgba(192, 119, 54, 0.12)",
      isPreviewable: true,
      previewType: "image",
    };
  }

  // PDF
  if (mime === "application/pdf" || ext === ".pdf") {
    return {
      type: "PDF",
      icon: "bi-file-earmark-pdf-fill",
      color: "#d94343",
      bg: "rgba(217, 67, 67, 0.12)",
      isPreviewable: true,
      previewType: "pdf",
    };
  }

  // Word Documents
  if (
    mime.includes("word") ||
    mime.includes("officedocument.wordprocessingml") ||
    [".doc", ".docx"].includes(ext)
  ) {
    return {
      type: "Word Document",
      icon: "bi-file-earmark-word-fill",
      color: "#2b579a",
      bg: "rgba(43, 87, 154, 0.12)",
      isPreviewable: false,
    };
  }

  // Excel / Spreadsheets
  if (
    mime.includes("excel") ||
    mime.includes("officedocument.spreadsheetml") ||
    [".xls", ".xlsx", ".csv"].includes(ext)
  ) {
    return {
      type: "Spreadsheet",
      icon: "bi-file-earmark-excel-fill",
      color: "#1e7145",
      bg: "rgba(30, 113, 69, 0.12)",
      isPreviewable: false,
    };
  }

  // PowerPoint Presentations
  if (
    mime.includes("powerpoint") ||
    mime.includes("officedocument.presentationml") ||
    [".ppt", ".pptx"].includes(ext)
  ) {
    return {
      type: "Presentation",
      icon: "bi-file-earmark-ppt-fill",
      color: "#d24726",
      bg: "rgba(210, 71, 38, 0.12)",
      isPreviewable: false,
    };
  }

  // ZIP Archives
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar") ||
    ext === ".zip"
  ) {
    return {
      type: "Archive",
      icon: "bi-file-earmark-zip-fill",
      color: "#6f42c1",
      bg: "rgba(111, 66, 193, 0.12)",
      isPreviewable: false,
    };
  }

  // Text
  if (mime.startsWith("text/") || ext === ".txt") {
    return {
      type: "Text",
      icon: "bi-file-earmark-text-fill",
      color: "#6c757d",
      bg: "rgba(108, 117, 125, 0.12)",
      isPreviewable: false,
    };
  }

  // Default fallback
  return {
    type: "Document",
    icon: "bi-file-earmark-fill",
    color: "#5c4033",
    bg: "rgba(92, 64, 51, 0.12)",
    isPreviewable: false,
  };
};

/**
 * Trigger secure download for an attachment
 */
export const downloadAttachment = async (attachment) => {
  if (!attachment) return;

  const originalName = attachment.originalName || "attachment";

  try {
    // If the attachment has an ID, use our secure download API route
    if (attachment._id) {
      const downloadUrl = `${API_BASE_URL}/api/attachments/${attachment._id}/download`;
      const res = await axios.get(downloadUrl, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      return;
    }

    // Direct URL fallback (e.g. newly staged or direct signed link)
    if (attachment.url) {
      const link = document.createElement("a");
      link.href = attachment.url;
      link.setAttribute("download", originalName);
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } catch (error) {
    console.error("Download failed:", error);
    // If direct link is accessible, attempt window open fallback
    if (attachment.url) {
      window.open(attachment.url, "_blank");
    } else {
      throw error;
    }
  }
};

/**
 * Get authenticated preview URL for PDF or Image
 */
export const getPreviewUrl = (attachment) => {
  if (!attachment) return "";

  // If local development path or Cloudinary URL
  if (attachment.url && attachment.url.startsWith("http")) {
    return attachment.url;
  }

  if (attachment._id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/api/attachments/${attachment._id}/download?token=${encodeURIComponent(token)}`;
  }

  return attachment.url || "";
};
