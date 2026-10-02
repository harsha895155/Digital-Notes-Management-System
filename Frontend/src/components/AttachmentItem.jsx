import React, { useState } from "react";
import { formatFileSize, getFileInfo, downloadAttachment } from "../utils/fileUtils";

function AttachmentItem({
  attachment,
  onPreview,
  onDelete,
  canDelete = true,
  isDeleting = false,
}) {
  const [downloading, setDownloading] = useState(false);
  const info = getFileInfo(attachment);
  const originalName = attachment.originalName || "Attachment";
  const sizeText = formatFileSize(attachment.size);
  const uploadDate = attachment.uploadedAt
    ? new Date(attachment.uploadedAt).toLocaleDateString("en-GB").replace(/\//g, "-")
    : null;

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      await downloadAttachment(attachment);
    } catch (err) {
      console.error("Failed to download attachment:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && !isDeleting) {
      onDelete(attachment);
    }
  };

  return (
    <div className="attachment-item">
      <div className="attachment-left">
        <div
          className="attachment-icon-wrapper"
          style={{ background: info.bg, color: info.color }}
        >
          {info.previewType === "image" && attachment.url ? (
            <img
              src={attachment.url}
              alt={originalName}
              className="attachment-thumbnail-img"
              loading="lazy"
            />
          ) : (
            <i className={`bi ${info.icon}`}></i>
          )}
        </div>

        <div className="attachment-meta">
          <span className="attachment-name" title={originalName}>
            {originalName}
          </span>
          <div className="attachment-submeta">
            <span>{info.type}</span>
            <span className="attachment-submeta-dot">•</span>
            <span>{sizeText}</span>
            {uploadDate && (
              <>
                <span className="attachment-submeta-dot">•</span>
                <span>{uploadDate}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="attachment-actions">
        {info.isPreviewable && (
          <button
            type="button"
            className="btn-attachment-action"
            title="Preview File"
            onClick={() => onPreview && onPreview(attachment)}
          >
            <i className="bi bi-eye"></i>
          </button>
        )}

        <button
          type="button"
          className="btn-attachment-action btn-download"
          title="Download File"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          ) : (
            <i className="bi bi-download"></i>
          )}
        </button>

        {canDelete && (
          <button
            type="button"
            className="btn-attachment-action btn-remove"
            title="Remove Attachment"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            ) : (
              <i className="bi bi-trash3"></i>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default AttachmentItem;
