import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DEV_TOKEN = import.meta.env.VITE_DEV_MASTER_TOKEN?.trim() || '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-PJT-Client': 'Frontend',
  },
  timeout: 10000,
  withCredentials: true,
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
