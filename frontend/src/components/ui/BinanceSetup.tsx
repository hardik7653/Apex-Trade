'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Shield, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface BinanceSetupProps {
  onSetupComplete: () => void;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  account_info?: any;
}

const BinanceSetup: React.FC<BinanceSetupProps> = ({ onSetupComplete }) => {
  const { push } = useToast();
  const { resolvedTheme } = useTheme();
  const [showSetup, setShowSetup] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    try {
      const response = await api.get('/binance/credentials');
      if (response.data?.ok && response.data.credentials_id) {
        setHasCredentials(true);
        checkConnectionStatus();
      }
    } catch (error) {
      console.error('Failed to check credentials:', error);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await api.get('/binance/status');
      if (response.data?.ok) {
        setConnectionStatus(response.data);
        if (response.data.connected) {
          onSetupComplete();
        }
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };

  const handleSetup = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      push({ msg: 'Please enter both API Key and Secret', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/binance/credentials', {
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim()
      });

      if (response.data?.ok) {
        push({ msg: 'Credentials stored successfully!', type: 'success' });
        setApiKey('');
        setApiSecret('');
        setShowSetup(false);
        setHasCredentials(true);
        
        // Auto-connect
        await connectToBinance();
      }
    } catch (error: any) {
      push({ 
        msg: error.response?.data?.detail || 'Failed to store credentials', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToBinance = async () => {
    try {
      const response = await api.post('/binance/connect');
      if (response.data?.ok) {
        setConnectionStatus(response.data);
        if (response.data.connected) {
          push({ msg: 'Successfully connected to Binance!', type: 'success' });
          onSetupComplete();
        }
      }
    } catch (error: any) {
      push({ 
        msg: error.response?.data?.detail || 'Failed to connect to Binance', 
        type: 'error' 
      });
    }
  };

  const deleteCredentials = async () => {
    if (!connectionStatus?.account_info) return;
    
    try {
      const response = await api.delete(`/binance/credentials/${connectionStatus.account_info.id}`);
      if (response.data?.ok) {
        push({ msg: 'Credentials deleted successfully', type: 'success' });
        setHasCredentials(false);
        setConnectionStatus(null);
        onSetupComplete();
      }
    } catch (error: any) {
      push({ 
        msg: error.response?.data?.detail || 'Failed to delete credentials', 
        type: 'error' 
      });
    }
  };

  const testConnection = async () => {
    try {
      const response = await api.get('/binance/test');
      if (response.data?.ok) {
        push({ msg: 'Connection test successful!', type: 'success' });
      }
    } catch (error: any) {
      push({ 
        msg: error.response?.data?.detail || 'Connection test failed', 
        type: 'error' 
      });
    }
  };

  if (connectionStatus?.connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-green-200 dark:border-green-800 overflow-hidden"
      >
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                  Connected to Binance
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {connectionStatus.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={testConnection}
                className="px-3 py-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                Test
              </button>
              <button
                onClick={deleteCredentials}
                className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
        
        {connectionStatus.account_info && (
          <div className="p-6 border-t border-green-200 dark:border-green-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Account Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {connectionStatus.account_info.account_type}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Permissions:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {connectionStatus.account_info.permissions?.join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                Binance API Setup
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Connect your Binance account to start trading
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showSetup ? 'Cancel' : 'Setup API'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Security Notice</p>
                    <p className="text-xs">
                      Your API credentials are encrypted and stored securely. Only trading permissions are required.
                      Never share your API secret with anyone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Binance API key"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your Binance API secret"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSetup}
                  disabled={loading || !apiKey.trim() || !apiSecret.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Setting up...
                    </div>
                  ) : (
                    'Save & Connect'
                  )}
                </button>
                
                {hasCredentials && (
                  <button
                    onClick={connectToBinance}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasCredentials && !connectionStatus?.connected && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Credentials stored. Click "Reconnect" to establish connection.
              </span>
            </div>
            <button
              onClick={connectToBinance}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BinanceSetup;

