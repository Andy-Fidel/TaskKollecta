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
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            localStorage.removeItem('activeOrgId');
            localStorage.removeItem('lastActivity');
          }
        } catch {
          localStorage.removeItem('token');
        }
      }

      try {
        const { data } = await api.get('/users/me', {
          headers: { 'x-skip-auth-redirect': 'true' },
        });
        setUser(data);
      } catch {
        localStorage.removeItem('token');
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

  const logout = async () => {
    try {
      await api.post('/users/logout', null, {
        headers: { 'x-skip-auth-redirect': 'true' },
      });
    } catch {
      // Always clear the local session state even if the server cookie is already gone.
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('activeOrgId');
      localStorage.removeItem('project_filter');
      localStorage.removeItem('lastActivity');
    }
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
