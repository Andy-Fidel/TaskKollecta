import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Your backend URL
});

// Interceptor: Automatically add the Token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Read token from browser storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;