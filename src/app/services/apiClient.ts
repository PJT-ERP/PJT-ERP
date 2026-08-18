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
  timeout: 30000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const config = error.config;
    if (!config) return Promise.reject(error);
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount < 3 && (!error.response || error.code === 'ECONNABORTED' || (error.response.status && error.response.status >= 500))) {
      config.__retryCount += 1;
      const delay = Math.pow(2, config.__retryCount) * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(config);
    }
    return Promise.reject(error);
  }
);

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

let _unauthorizedDispatched = false;

apiClient.interceptors.response.use(
  (response) => {
    // Successful response means the token is valid — reset the debounce flag
    _unauthorizedDispatched = false;
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Never clear token or dispatch for auth-related endpoints — prevents cascade
      const url = error.config?.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/me')) {
        return Promise.reject(error);
      }

      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");

      // Already on login page — no need to dispatch
      if (window.location.pathname.includes("/login")) {
        return Promise.reject(error);
      }

      // Debounce: only dispatch once per cascade of 401s
      if (!_unauthorizedDispatched) {
        _unauthorizedDispatched = true;
        window.dispatchEvent(new CustomEvent('unauthorized'));
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
