import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testnet, setTestnet] = useState(true);

  // Configure axios defaults
  axios.defaults.withCredentials = true;
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/account');
      if (response.data && !response.data.error) {
        setIsAuthenticated(true);
        setUser(response.data);
      }
    } catch (error) {
      // User is not authenticated
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (apiKey, apiSecret, useTestnet = true) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/login', {
        api_key: apiKey,
        api_secret: apiSecret,
        testnet: useTestnet
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        setUser(response.data.account);
        setTestnet(useTestnet);
        
        toast.success('Login successful!');
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    testnet,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};



