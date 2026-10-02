import React, { useEffect } from "react";
import { getFileInfo, downloadAttachment, getPreviewUrl } from "../utils/fileUtils";

function AttachmentPreview({ attachment, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  const info = getFileInfo(attachment);
  const previewUrl = getPreviewUrl(attachment);
  const name = attachment.originalName || "Attachment";

  return (
    <div className="attachment-modal-overlay" onClick={onClose}>
      <div
        className="attachment-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="attachment-modal-header">
          <div className="attachment-modal-title">
            <i className={`bi ${info.icon}`} style={{ color: info.color }}></i>
            <span>{name}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          ></button>
        </div>

        <div className="attachment-modal-body">
          {info.previewType === "image" ? (
            <img
              src={previewUrl}
              alt={name}
              className="attachment-modal-img"
              loading="lazy"
            />
          ) : info.previewType === "pdf" ? (
            <iframe
              src={previewUrl}
              title={name}
              className="attachment-modal-iframe"
            />
          ) : (
            <div className="text-center p-4">
              <i
                className={`bi ${info.icon} display-3`}
                style={{ color: info.color }}
              ></i>
              <h5 className="mt-3 text-dark">{name}</h5>
              <p className="text-muted">
                Direct in-browser preview is not supported for this file type.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => downloadAttachment(attachment)}
              >
                <i className="bi bi-download me-1"></i> Download File
              </button>
            </div>
          )}
        </div>

        <div className="attachment-modal-footer">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-secondary btn-sm"
            >
              <i className="bi bi-box-arrow-up-right me-1"></i> Open in New Tab
            </a>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => downloadAttachment(attachment)}
          >
            <i className="bi bi-download me-1"></i> Download
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttachmentPreview;
