import axios from 'axios';

// Create configured Axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spider_sense_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting and 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('spider_sense_token');
      localStorage.removeItem('spider_sense_user');
      window.dispatchEvent(new Event('spider-sense-auth-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
