// Centralized API configuration for production and development
const getBaseUrl = () => {
  // If in browser environment
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // When visiting from localhost or 127.0.0.1, ALWAYS use local backend on port 5000
    if (host === "localhost" || host === "127.0.0.1") {
      return import.meta.env.VITE_DEV_API_URL || "http://localhost:5000";
    }
  }

  // Production backend URL
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
