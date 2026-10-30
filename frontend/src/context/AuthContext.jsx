import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('spider_sense_token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('spider_sense_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Parse and set user from raw token
  const processToken = (rawToken) => {
    try {
      const decoded = jwtDecode(rawToken);
      // decoded contains: { sub, username, role, exp }
      const userData = {
        id: parseInt(decoded.sub, 10),
        username: decoded.username,
        role: decoded.role,
        exp: decoded.exp,
      };

      // Check if expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        logout();
        return false;
      }

      setToken(rawToken);
      setUser(userData);
      localStorage.setItem('spider_sense_token', rawToken);
      localStorage.setItem('spider_sense_user', JSON.stringify(userData));
      return true;
    } catch (err) {
      console.error('Invalid token payload:', err);
      logout();
      return false;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('spider_sense_token');
    if (savedToken) {
      processToken(savedToken);
    }
    setLoading(false);

    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('spider-sense-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('spider-sense-auth-expired', handleAuthExpired);
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { access_token } = response.data;
    if (access_token) {
      processToken(access_token);
    }
    return response.data;
  };

  const register = async (username, password, role) => {
    const response = await api.post('/auth/register', { username, password, role });
    const { access_token } = response.data;
    if (access_token) {
      processToken(access_token);
    }
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('spider_sense_token');
    localStorage.removeItem('spider_sense_user');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
