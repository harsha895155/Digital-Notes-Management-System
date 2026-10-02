import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SecureStorage } from '../utils/storage';

// Production Render backend as default fallback
const DEFAULT_API_URL = 'https://digital-notes-management-system.onrender.com';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to attach auth token to request:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and 401 expiry
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    if (status === 401) {
      console.warn('Session expired or unauthorized (401). Logging out...');
      await SecureStorage.clearAll();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    let friendlyMessage = serverMessage || 'An unexpected error occurred.';

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        friendlyMessage = 'Request timed out. Please check your internet connection.';
      } else {
        friendlyMessage = 'Unable to connect to MindDesk server. Please check your internet connection.';
      }
    } else if (status === 403) {
      friendlyMessage = serverMessage || 'You do not have permission to perform this action.';
    } else if (status === 404) {
      friendlyMessage = serverMessage || 'The requested resource was not found.';
    } else if (status === 500) {
      friendlyMessage = serverMessage || 'Server error. Please try again in a moment.';
    }

    return Promise.reject(new Error(friendlyMessage));
  }
);

export default api;
