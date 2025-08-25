import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Eye, EyeOff, Key, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    testnet: true
  });
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    }
    
    if (!formData.apiSecret.trim()) {
      newErrors.apiSecret = 'API Secret is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const result = await login(formData.apiKey, formData.apiSecret, formData.testnet);
      if (result.success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Key className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to ApexTrader
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect your Binance API to start trading
          </p>
        </div>

        {/* Theme Toggle */}
        <div className="flex justify-center">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API Key
              </label>
              <div className="mt-1 relative">
                <input
                  id="apiKey"
                  name="apiKey"
                  type="text"
                  required
                  value={formData.apiKey}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.apiKey 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  } placeholder-gray-500 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800`}
                  placeholder="Enter your Binance API Key"
                />
                {errors.apiKey && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.apiKey && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.apiKey}</p>
              )}
            </div>

            {/* API Secret */}
            <div>
              <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API Secret
              </label>
              <div className="mt-1 relative">
                <input
                  id="apiSecret"
                  name="apiSecret"
                  type={showSecret ? 'text' : 'password'}
                  required
                  value={formData.apiSecret}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.apiSecret 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  } placeholder-gray-500 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800`}
                  placeholder="Enter your Binance API Secret"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
                {errors.apiSecret && (
                  <div className="absolute inset-y-0 right-0 pr-12 flex items-center pointer-events-none">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.apiSecret && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.apiSecret}</p>
              )}
            </div>

            {/* Testnet Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="testnet"
                  name="testnet"
                  type="checkbox"
                  checked={formData.testnet}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="testnet" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Use Testnet (Demo Trading)
                </label>
              </div>
            </div>

            {/* Warning */}
            {!formData.testnet && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Live Trading Warning
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>
                        You are connecting to the main Binance network. This will use real funds. 
                        Make sure you understand the risks before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Testnet Info */}
            {formData.testnet && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Testnet Mode
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      <p>
                        You are using Binance Testnet. This is safe for testing with virtual funds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Connect to Binance
                </div>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Don't have API keys?{' '}
              <a
                href="https://www.binance.com/en/my/settings/api-management"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Create them here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;



