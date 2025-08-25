'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/ui/Topbar';
import TradingChart from '@/components/ui/TradingChart';
import TradingPanel from '@/components/ui/TradingPanel';
import ModelStatus from '@/components/ui/ModelStatus';
import AccountOverview from '@/components/ui/AccountOverview';
import BinanceSetup from '@/components/ui/BinanceSetup';
import { useToast } from '@/components/context/ToastContext';
import api from '@/lib/api';

export default function Home() {
  const { push } = useToast();
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [klines, setKlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [binanceConnected, setBinanceConnected] = useState(false);

  useEffect(() => {
    checkBinanceConnection();
    if (binanceConnected) {
      loadKlines();
    }
  }, [activeSymbol, binanceConnected]);

  const checkBinanceConnection = async () => {
    try {
      const response = await api.get('/binance/status');
      if (response.data?.ok && response.data.connected) {
        setBinanceConnected(true);
      }
    } catch (error) {
      console.error('Failed to check Binance connection:', error);
    }
  };

  const loadKlines = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/klines/${activeSymbol}?limit=500`);
      if (response.data?.ok) {
        setKlines(response.data.klines);
      }
    } catch (error) {
      push({ msg: 'Failed to load market data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBinanceSetupComplete = () => {
    setBinanceConnected(true);
    loadKlines();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Topbar />
      
      <main className="p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to ApexTrader
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Professional trading platform with advanced machine learning capabilities
          </p>
        </div>

        {/* Binance Setup Section */}
        <BinanceSetup onSetupComplete={handleBinanceSetupComplete} />

        {binanceConnected ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <ModelStatus />
              <AccountOverview />
            </div>
            
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {activeSymbol} Chart
                    </h2>
                    <div className="flex space-x-2">
                      {['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT'].map((symbol) => (
                        <button
                          key={symbol}
                          onClick={() => setActiveSymbol(symbol)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            activeSymbol === symbol
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {loading ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <TradingChart data={klines} symbol={activeSymbol} />
                  )}
                </div>
              </div>
              
              <TradingPanel 
                symbol={activeSymbol}
                onTradeSuccess={() => {
                  push({ msg: 'Trade executed successfully', type: 'success' });
                  loadKlines();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Connect to Binance to Start Trading
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Set up your Binance API credentials above to access real-time market data and execute trades.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
