import { createContext, useContext, useState, useEffect } from 'react';
import { facilitatorAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await facilitatorAPI.getMe();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await facilitatorAPI.login({ username, password });
      const { access_token } = response.data;

      localStorage.setItem('token', access_token);
      setToken(access_token);

      // Fetch user data immediately after login
      try {
        const userResponse = await facilitatorAPI.getMe();
        setUser(userResponse.data);
      } catch (error) {
        console.error('Failed to fetch user after login:', error);
      }

      toast.success('Login successful!');
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      return false;
    }
  };

  const register = async (username, password) => {
    try {
      await facilitatorAPI.register({ username, password });
      toast.success('Registration successful! Please login.');
      return true;
    } catch (error) {
      let message = 'Registration failed';

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // Handle Pydantic validation errors (array of errors)
        if (Array.isArray(detail)) {
          message = detail.map(err => err.msg).join(', ');
        } else if (typeof detail === 'string') {
          message = detail;
        }
      }

      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
