// Centralized API configuration for production and development
const getBaseUrl = () => {
  // In local development on localhost, default to local backend on port 5000
  if (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    import.meta.env.VITE_USE_REMOTE !== "true"
  ) {
    return import.meta.env.VITE_DEV_API_URL || "http://localhost:5000";
  }

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
