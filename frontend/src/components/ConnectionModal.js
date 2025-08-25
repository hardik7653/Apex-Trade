import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Key, Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';

const ConnectionModal = ({ onConnectionSuccess, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMode, setSelectedMode] = useState('testnet');
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsConnecting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: data.api_key,
          api_secret: data.api_secret,
          testnet: selectedMode === 'testnet'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        onConnectionSuccess(selectedMode);
      } else {
        toast.error(result.message || 'Connection failed');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect. Please check your internet connection.');
    } finally {
      setIsConnecting(false);
    }
  };

  const getModeInfo = () => {
    if (selectedMode === 'testnet') {
      return {
        title: 'Binance Testnet',
        description: 'Practice trading with virtual funds',
        url: 'https://testnet.binance.vision/key/generate',
        color: 'warning-orange',
        icon: '🧪'
      };
    } else {
      return {
        title: 'Binance Live',
        description: 'Real trading with actual funds',
        url: 'https://www.binance.com/en/my/settings/api-management',
        color: 'success-green',
        icon: '🚀'
      };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-binance-dark border border-binance-gray rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-binance-yellow rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-binance-darker" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect to Binance</h2>
          <p className="text-gray-400">Enter your API credentials to start trading</p>
        </div>

        {/* Mode Selection */}
        <div className="mb-6">
          <div className="flex rounded-lg bg-binance-gray p-1">
            <button
              type="button"
              onClick={() => setSelectedMode('testnet')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedMode === 'testnet'
                  ? 'bg-warning-orange text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧪 Testnet
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('live')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedMode === 'live'
                  ? 'bg-success-green text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚀 Live Trading
            </button>
          </div>
        </div>

        {/* Mode Info */}
        <div className={`mb-6 p-4 rounded-lg border border-${modeInfo.color}/30 bg-${modeInfo.color}/10`}>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{modeInfo.icon}</span>
            <div>
              <h3 className="font-medium text-white">{modeInfo.title}</h3>
              <p className="text-sm text-gray-400">{modeInfo.description}</p>
            </div>
          </div>
          
          <a
            href={modeInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-sm text-binance-yellow hover:text-yellow-400 mt-3"
          >
            <span>Get API Keys</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Warning for Live Trading */}
        {selectedMode === 'live' && (
          <div className="mb-6 p-4 rounded-lg border border-error-red/30 bg-error-red/10">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-error-red" />
              <span className="text-sm font-medium text-error-red">Live Trading Warning</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              You are connecting to live Binance trading. Ensure your API keys have only trading permissions (no withdrawals).
            </p>
          </div>
        )}

        {/* Connection Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
            </label>
            <input
              type="text"
              {...register('api_key', { required: 'API Key is required' })}
              className="w-full px-3 py-2 bg-binance-gray border border-binance-light-gray text-white rounded-md form-input"
              placeholder="Enter your API key"
            />
            {errors.api_key && (
              <p className="text-error-red text-sm mt-1">{errors.api_key.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Secret
            </label>
            <input
              type="password"
              {...register('api_secret', { required: 'API Secret is required' })}
              className="w-full px-3 py-2 bg-binance-gray border border-binance-light-gray text-white rounded-md form-input"
              placeholder="Enter your API secret"
            />
            {errors.api_secret && (
              <p className="text-error-red text-sm mt-1">{errors.api_secret.message}</p>
            )}
          </div>

          {/* Security Note */}
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-binance-gray/50 border border-binance-light-gray">
            <Shield className="w-5 h-5 text-binance-yellow mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-400">
              <p className="font-medium text-white mb-1">Security Note</p>
              <p>Your API credentials are stored locally and never sent to our servers. Only enable trading permissions in your Binance account.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-binance-gray text-gray-300 rounded-md hover:bg-binance-light-gray transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="flex-1 px-4 py-2 btn-primary text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectionModal;




