// Centralized API configuration for production and development
// If VITE_API_URL is provided, use it; otherwise use relative path "" for same-origin Vercel serverless deployment
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default API_BASE_URL;
