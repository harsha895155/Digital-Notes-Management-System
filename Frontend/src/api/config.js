// Centralized API configuration for production and development
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    // When visiting from localhost or 127.0.0.1, connect to local backend on port 5000
    if (host === "localhost" || host === "127.0.0.1") {
      return (
        import.meta.env.VITE_DEV_API_URL ||
        `${window.location.protocol}//${host}:5000`
      );
    }

    // When running on Vercel (*.vercel.app), use same-origin relative API path ("")
    // Vercel rewrites will proxy /api/* directly to the backend, preventing all cross-origin blocks
    if (host.endsWith(".vercel.app")) {
      return "";
    }
  }

  // Production backend URL fallback
  return (
    import.meta.env.VITE_API_URL ||
    "https://digital-notes-management-system.onrender.com"
  );
};

const API_BASE_URL = getBaseUrl().replace(/\/+$/, "");

export const getAuthToken = () => {
  try {
    return localStorage.getItem("token") || "";
  } catch (e) {
    return "";
  }
};

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getAuthToken();
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default API_BASE_URL;
