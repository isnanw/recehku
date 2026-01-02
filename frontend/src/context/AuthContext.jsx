import { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Load from localStorage first for immediate availability
      const storedUser = localStorage.getItem('user');
      const storedWorkspaces = localStorage.getItem('workspaces');

      if (storedUser && storedWorkspaces) {
        try {
          setUser(JSON.parse(storedUser));
          setWorkspaces(JSON.parse(storedWorkspaces));
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
        }
      }

      // Then fetch fresh data from API
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setWorkspaces(response.data.workspaces);

      // Update localStorage with fresh data
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('workspaces', JSON.stringify(response.data.workspaces));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspaces');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setWorkspaces(response.data.workspaces);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setWorkspaces([response.data.workspace]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspaces');
    localStorage.removeItem('currentWorkspaceId');
    setUser(null);
    setWorkspaces([]);
  };

  const value = {
    user,
    workspaces,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
