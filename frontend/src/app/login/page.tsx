'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First store credentials
      const credResponse = await api.post('/binance/credentials', {
        api_key: apiKey,
        api_secret: apiSecret
      });

      if (!credResponse.data?.ok) {
        throw new Error('Failed to store credentials');
      }

      // Then connect to Binance
      const connectResponse = await api.post('/binance/connect');
      
      if (connectResponse.data?.ok && connectResponse.data?.connected) {
        toast.success('Successfully connected to Binance API!');
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        throw new Error(connectResponse.data?.message || 'Failed to connect to Binance');
      }
    } catch (err: any) {
      const errorMsg = err.error || 'Failed to connect. Please check your API credentials.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-10 bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">ApexTrader</h1>
          <p className="mt-2 text-sm text-gray-400">AI-Powered Crypto Trading Bot</p>
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="api-key" className="sr-only">API Key</label>
              <input
                id="api-key"
                name="apiKey"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Binance API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="api-secret" className="sr-only">API Secret</label>
              <input
                id="api-secret"
                name="apiSecret"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Binance API Secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="testnet"
                name="testnet"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-700 rounded bg-gray-700"
                checked={isTestnet}
                onChange={(e) => setIsTestnet(e.target.checked)}
              />
              <label htmlFor="testnet" className="ml-2 block text-sm text-gray-300">
                Use Testnet (Practice Mode)
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading ? 'Connecting...' : 'Connect to Binance'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-xs text-gray-400">
              Don't have API keys? Get them from{' '}
              <a 
                href={isTestnet ? "https://testnet.binance.vision/" : "https://www.binance.com/en/my/settings/api-management"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                {isTestnet ? 'Binance Testnet' : 'Binance'}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}