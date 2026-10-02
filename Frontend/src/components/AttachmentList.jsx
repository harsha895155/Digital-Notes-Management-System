import React, { useState } from "react";
import AttachmentItem from "./AttachmentItem";
import AttachmentPreview from "./AttachmentPreview";

function AttachmentList({
  attachments = [],
  onDelete,
  canDelete = true,
  deletingId = null,
  title,
}) {
  const [previewItem, setPreviewItem] = useState(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="attachment-list-wrapper mt-3">
      {title && (
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-semibold text-dark" style={{ fontSize: "0.9rem" }}>
            {title} ({attachments.length})
          </span>
        </div>
      )}

      <div className="attachment-list">
        {attachments.map((att, index) => {
          const key = att._id || att.storageKey || `${att.originalName}-${index}`;
          const isDeleting = deletingId === (att._id || att.storageKey);

          return (
            <AttachmentItem
              key={key}
              attachment={att}
              onPreview={(item) => setPreviewItem(item)}
              onDelete={onDelete}
              canDelete={canDelete}
              isDeleting={isDeleting}
            />
          );
        })}
      </div>

      {previewItem && (
        <AttachmentPreview
          attachment={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

export default AttachmentList;
