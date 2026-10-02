// Centralized API configuration for production and development
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    // When visiting from localhost or 127.0.0.1, connect to local backend on port 5000
    // Using 127.0.0.1 avoids IPv6 (::1) vs IPv4 (127.0.0.1) resolution mismatches on Windows
    if (host === "localhost" || host === "127.0.0.1") {
      return import.meta.env.VITE_DEV_API_URL || "http://127.0.0.1:5000";
    }
  }

  // Production backend URL fallback (Render backend with full CORS & 10MB upload support)
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
