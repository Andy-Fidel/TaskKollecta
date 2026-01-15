import axios from 'axios';

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

export default api;