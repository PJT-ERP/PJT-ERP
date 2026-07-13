import axios from 'axios';
import axiosRetry from 'axios-retry';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DEV_TOKEN = import.meta.env.VITE_DEV_MASTER_TOKEN?.trim() || '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-PJT-Client': 'Frontend',
  },
  timeout: 30000, // Increased timeout to 30s for bad networks
  withCredentials: true,
});

// Configure automatic retries for network errors and timeouts
axiosRetry(apiClient, {
  retries: 3, // Retry up to 3 times
  retryDelay: axiosRetry.exponentialDelay, // Exponential backoff (100ms, 200ms, 400ms...)
  retryCondition: (error) => {
    // Retry on standard network errors (like disconnected) OR timeout (ECONNABORTED) OR 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else if (DEV_TOKEN && config.headers && import.meta.env.DEV) {
    config.headers.set('Authorization', `Bearer ${DEV_TOKEN}`);
  }
  
  if (config.data instanceof FormData && config.headers) {
    config.headers.delete('Content-Type');
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
