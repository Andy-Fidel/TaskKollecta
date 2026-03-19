import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in when the app starts
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Proactively check if JWT has expired before making API call
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            // Token expired — clear everything
            localStorage.removeItem('token');
            localStorage.removeItem('activeOrgId');
            localStorage.removeItem('lastActivity');
            setLoading(false);
            return;
          }
        } catch {
          // Malformed token — remove it
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }

        try {
          const { data } = await api.get('/users/me');
          setUser(data);
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/users/login', { email, password });
    localStorage.setItem('token', data.token); // Save token to browser
    setUser(data);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    
    // Clear the active organization
    localStorage.removeItem('activeOrgId'); 
    
    // Clear any other cached filters
    localStorage.removeItem('project_filter');

    // Clear idle timeout timestamp
    localStorage.removeItem('lastActivity');
  };

  // Auto-logout after 2 hours of inactivity
  useIdleTimeout(user, logout);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export { AuthContext };