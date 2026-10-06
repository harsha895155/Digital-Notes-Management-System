import axios from "axios";

// Centralized API configuration for production and development
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    // Localhost or 127.0.0.1
    if (host === "localhost" || host === "127.0.0.1") {
      return import.meta.env.VITE_DEV_API_URL || "http://127.0.0.1:5000";
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

export const getRefreshToken = () => {
  try {
    return localStorage.getItem("refreshToken") || "";
  } catch (e) {
    return "";
  }
};

export const setAuthSession = (accessToken, refreshToken = null, user = null) => {
  try {
    if (accessToken) localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("loginTime", String(Date.now()));
  } catch (e) {
    console.error("Failed to store auth session:", e);
  }
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
  } catch (e) {
    console.error("Failed to clear auth session:", e);
  }
};

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getAuthToken();
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Create configured Axios instance with refresh interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor: attach current Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/api/login") &&
      !originalRequest.url.includes("/api/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken = getRefreshToken();

      if (!storedRefreshToken) {
        isRefreshing = false;
        clearAuthSession();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { withCredentials: true }
        );

        const newAccessToken = res.data.accessToken || res.data.token;
        const newRefreshToken = res.data.refreshToken;

        setAuthSession(newAccessToken, newRefreshToken);
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        clearAuthSession();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
export default API_BASE_URL;
