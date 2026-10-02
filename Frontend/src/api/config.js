// Centralized API configuration for production and development
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://digital-notes-management-system.onrender.com"
).replace(/\/+$/, "");

export default API_BASE_URL;
