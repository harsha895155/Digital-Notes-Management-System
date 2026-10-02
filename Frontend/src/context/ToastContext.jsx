import { createContext, useContext, useState, useCallback, useEffect } from "react";
import "../components/Toast.css";

const ToastContext = createContext(null);

// Global singleton dispatcher so toast can be called even outside React component tree
let globalShowToast = null;
let globalShowConfirm = null;

export const toast = {
  success: (message, title = "Success") => globalShowToast?.(message, "success", title),
  error: (message, title = "Error") => globalShowToast?.(message, "error", title),
  warning: (message, title = "Warning") => globalShowToast?.(message, "warning", title),
  info: (message, title = "Notice") => globalShowToast?.(message, "info", title),
};

export const showConfirm = (options) => {
  if (globalShowConfirm) {
    return globalShowConfirm(options);
  }
  return Promise.resolve(window.confirm(options.message || "Are you sure?"));
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  const showToast = useCallback(
    (message, type = "info", title = null, duration = 4000) => {
      if (!message) return;
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      
      const defaultTitles = {
        success: "Success",
        error: "Attention Required",
        warning: "Warning",
        info: "Notification",
      };

      const toastItem = {
        id,
        message,
        type,
        title: title || defaultTitles[type] || "Notice",
        duration,
        closing: false,
      };

      setToasts((prev) => [...prev.slice(-3), toastItem]); // keep max 4 toasts stacked

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const requestConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setModal({
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure you want to proceed?",
        type: options.type || "danger",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        },
      });
    });
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    globalShowConfirm = requestConfirm;

    // Gracefully intercept standard browser alert() so any stray alerts render as sleek toasts
    const originalAlert = window.alert;
    window.alert = (rawMsg) => {
      const msg = String(rawMsg || "");
      if (/failed|error|incorrect|invalid|not match|required|denied/i.test(msg)) {
        showToast(msg, "error");
      } else if (/success|created|updated|deleted|welcome|saved/i.test(msg)) {
        showToast(msg, "success");
      } else if (/warning|please|careful|expired/i.test(msg)) {
        showToast(msg, "warning");
      } else {
        showToast(msg, "info");
      }
    };

    return () => {
      window.alert = originalAlert;
      globalShowToast = null;
      globalShowConfirm = null;
    };
  }, [showToast, requestConfirm]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <i className="bi bi-check-circle-fill"></i>;
      case "error":
        return <i className="bi bi-exclamation-octagon-fill"></i>;
      case "warning":
        return <i className="bi bi-exclamation-triangle-fill"></i>;
      default:
        return <i className="bi bi-info-circle-fill"></i>;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, toast, showConfirm: requestConfirm }}>
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="toast-container-fixed" aria-live="polite">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`gnapika-toast toast-${item.type} ${item.closing ? "toast-closing" : ""}`}
            role="alert"
          >
            <div className="toast-icon-badge">{getIcon(item.type)}</div>
            <div className="toast-content-wrapper">
              <div className="toast-title">{item.title}</div>
              <p className="toast-message">{item.message}</p>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(item.id)}
              aria-label="Close"
            >
              <i className="bi bi-x-lg"></i>
            </button>
            {item.duration > 0 && (
              <div
                className="toast-progress-bar"
                style={{ animationDuration: `${item.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Custom Confirmation Modal */}
      {modal && (
        <div className="gnapika-modal-backdrop" onClick={modal.onCancel}>
          <div
            className="gnapika-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`modal-icon-circle modal-icon-${modal.type}`}>
              {modal.type === "danger" ? (
                <i className="bi bi-trash3-fill"></i>
              ) : modal.type === "warning" ? (
                <i className="bi bi-exclamation-triangle-fill"></i>
              ) : (
                <i className="bi bi-question-circle-fill"></i>
              )}
            </div>
            <h3 className="modal-title">{modal.title}</h3>
            <p className="modal-message">{modal.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={modal.onCancel}
              >
                {modal.cancelText}
              </button>
              <button
                type="button"
                className={`modal-btn ${modal.type === "danger" ? "modal-btn-danger" : "modal-btn-confirm"}`}
                onClick={modal.onConfirm}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg, type) => toast[type]?.(msg) || toast.info(msg),
      toast,
      showConfirm,
    };
  }
  return context;
}
