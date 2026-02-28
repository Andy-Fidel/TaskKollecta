import axios from 'axios';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

// Interceptor: Automatically add the Token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const activeOrg = localStorage.getItem('activeOrgId'); 

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (activeOrg) {
    config.headers['x-active-org'] = activeOrg; 
  }
  
  return config;
});

// Interceptor: Handle expired/invalid tokens (401)
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isRedirecting &&
      !error.config?.url?.includes('/login') &&
      !error.config?.url?.includes('/register')
    ) {
      isRedirecting = true;
      localStorage.removeItem('token');
      localStorage.removeItem('activeOrgId');
      localStorage.removeItem('project_filter');
      toast.error('Session expired. Please log in again.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;