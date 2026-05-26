import axios from 'axios';

// API Client Setup (Disiapkan untuk integrasi backend di masa depan)
// Saat ini aplikasi MURNI FRONTEND menggunakan data Mock di AppContext.
// VITE_API_BASE_URL akan digunakan saat backend sudah siap.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request Interceptor: Attach Auth Token
apiClient.interceptors.request.use(
  (config) => {
    // Read token from localStorage or state management
    const token = localStorage.getItem('auth_token');
    
    if (token && config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global Errors (like 401)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If unauthorized, we might want to log the user out
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized access - perhaps token expired.');
      // Optional: Trigger a logout dispatch or redirect to /login here
      // window.location.href = '#/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
