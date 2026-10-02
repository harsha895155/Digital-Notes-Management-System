import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast } from "../context/ToastContext";
import { formatFileSize, getFileExtension } from "../utils/fileUtils";

const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_ALLOWED_EXTS = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".xls",
  ".xlsx",
  ".csv",
  ".ppt",
  ".pptx",
  ".zip",
];

function FileUpload({
  noteId = null,
  todoId = null,
  onUploadSuccess,
  disabled = false,
  maxFiles = 10,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [allowedExtensions, setAllowedExtensions] = useState(DEFAULT_ALLOWED_EXTS);
  const [maxSizeMB, setMaxSizeMB] = useState(DEFAULT_MAX_SIZE_MB);
  const fileInputRef = useRef(null);

  // Fetch server-configured limit and extensions on mount
  useEffect(() => {
    let isMounted = true;
    axios
      .get(`${API_BASE_URL}/api/attachments/config`)
      .then((res) => {
        if (isMounted && res.data) {
          if (res.data.maxFileSizeMB) setMaxSizeMB(res.data.maxFileSizeMB);
          if (res.data.allowedExtensions && Array.isArray(res.data.allowedExtensions)) {
            setAllowedExtensions(res.data.allowedExtensions);
          }
        }
      })
      .catch((err) => {
        // Fallback to defaults quietly
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndUploadFiles(Array.from(e.target.files));
      e.target.value = ""; // Reset input so same file can be re-selected if needed
    }
  };

  const processAndUploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    if (files.length > maxFiles) {
      toast.warning(`You can select at most ${maxFiles} files at a time.`, "Too Many Files");
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const validFiles = [];

    for (const file of files) {
      const ext = getFileExtension(file.name);

      // Check size
      if (file.size > maxSizeBytes) {
        toast.error(
          `"${file.name}" exceeds the ${maxSizeMB} MB size limit (${formatFileSize(file.size)}).`,
          "File Too Large"
        );
        continue;
      }

      // Check extension allowlist
      if (!allowedExtensions.includes(ext)) {
        toast.error(
          `"${file.name}" has an unsupported format (${ext || "unknown"}). Supported: ${allowedExtensions.slice(0, 7).join(", ")}, etc.`,
          "Unsupported Format"
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    await uploadFiles(validFiles);
  };

  const uploadFiles = async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setUploading(true);
    setUploadProgress(0);

    // Determine target upload endpoint
    let uploadUrl = `${API_BASE_URL}/api/upload`;
    if (noteId) {
      uploadUrl = `${API_BASE_URL}/api/notes/${noteId}/attachments`;
    } else if (todoId) {
      uploadUrl = `${API_BASE_URL}/api/todos/${todoId}/attachments`;
    }

    try {
      const res = await axios.post(uploadUrl, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      const uploadedList = res.data.attachments || [];
      const count = uploadedList.length;

      toast.success(
        `Successfully attached ${count} file${count === 1 ? "" : "s"}.`,
        "Upload Complete"
      );

      if (onUploadSuccess) {
        onUploadSuccess(uploadedList, res.data.note || res.data.todo || null);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to upload files. Please try again.";
      toast.error(errMsg, "Upload Failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="file-upload-component">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInput}
        accept={allowedExtensions.join(",")}
        disabled={disabled || uploading}
      />

      <div
        className={`attachment-upload-zone ${dragActive ? "drag-active" : ""} ${
          disabled || uploading ? "is-disabled" : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading && !disabled && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <div className="upload-zone-content">
          <div className="upload-icon-circle">
            {uploading ? (
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            ) : (
              <i className="bi bi-cloud-arrow-up"></i>
            )}
          </div>

          <p className="upload-title">
            {uploading
              ? "Uploading attachment(s)..."
              : dragActive
              ? "Drop your files here"
              : "Drag & drop files here, or browse"}
          </p>

          <p className="upload-subtitle">
            Supports PDF, DOC, DOCX, TXT, PNG, JPG, XLS, PPT, ZIP
          </p>

          <span className="upload-limits-note">
            Maximum {maxSizeMB} MB per file • Up to {maxFiles} files
          </span>

          {!uploading && (
            <button
              type="button"
              className="btn-browse mt-2"
              onClick={(e) => {
                e.stopPropagation();
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              disabled={disabled}
            >
              <i className="bi bi-folder2-open"></i> Browse Files
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="upload-progress-wrapper">
          <div className="upload-progress-info">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
