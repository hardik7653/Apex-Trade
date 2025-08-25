import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, TrendingUp, TrendingDown, Minus, Activity, BarChart3, Settings, Bell, Mail } from 'lucide-react';
import { API_BASE_URL } from '../config';

const AITradingBot = ({ connection }) => {
  const [botStatus, setBotStatus] = useState({
    running: false,
    symbols: [],
    last_signal: null,
    total_trades: 0,
    win_rate: 0.0
  });
  
  const [signals, setSignals] = useState({});
  const [performance, setPerformance] = useState({});
  const [selectedSymbols, setSelectedSymbols] = useState(['BTCUSDT', 'ETHUSDT']);
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    telegram: false,
    email: false
  });

  // Available symbols and intervals
  const availableSymbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT',
    'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'XRPUSDT', 'EOSUSDT',
    'SOLUSDT', 'MATICUSDT', 'AVAXUSDT', 'UNIUSDT', 'ATOMUSDT'
  ];

  const intervals = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' }
  ];

  // Fetch bot status
  const fetchBotStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bot/status`);
      if (response.ok) {
        const data = await response.json();
        setBotStatus(data);
      }
    } catch (err) {
      console.error('Error fetching bot status:', err);
    }
  }, []);

  // Fetch signals
  const fetchSignals = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bot/signals`);
      if (response.ok) {
        const data = await response.json();
        setSignals(data);
      }
    } catch (err) {
      console.error('Error fetching signals:', err);
    }
  }, []);

  // Fetch performance
  const fetchPerformance = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bot/performance`);
      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (err) {
      console.error('Error fetching performance:', err);
    }
  }, []);

  // Start bot
  const startBot = async () => {
    if (!connection.connected) {
      setError('Please connect to Binance API first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bot/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: selectedSymbols,
          interval: selectedInterval
        })
      });

      const data = await response.json();

      if (data.success) {
        setBotStatus(prev => ({ ...prev, running: true, symbols: selectedSymbols }));
        setError(null);
      } else {
        setError(data.error || 'Failed to start bot');
      }
    } catch (err) {
      setError('Failed to start bot');
      console.error('Error starting bot:', err);
    } finally {
      setLoading(false);
    }
  };

  // Stop bot
  const stopBot = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bot/stop`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setBotStatus(prev => ({ ...prev, running: false }));
        setError(null);
      } else {
        setError(data.error || 'Failed to stop bot');
      }
    } catch (err) {
      setError('Failed to stop bot');
      console.error('Error stopping bot:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    if (connection.connected) {
      fetchBotStatus();
      fetchSignals();
      fetchPerformance();

      const interval = setInterval(() => {
        fetchBotStatus();
        fetchSignals();
        fetchPerformance();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [connection.connected, fetchBotStatus, fetchSignals, fetchPerformance]);

  // Get signal icon and color
  const getSignalDisplay = (signal) => {
    switch (signal) {
      case 'BUY':
        return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100' };
      case 'SELL':
        return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-100' };
      case 'HOLD':
        return { icon: <Minus className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-100' };
      default:
        return { icon: <Minus className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  if (!connection.connected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">Not Connected</div>
          <div className="text-gray-400 text-sm">Please connect your Binance API to access the AI Trading Bot</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Control Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-600" />
            AI Trading Bot
          </h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${botStatus.running ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              {botStatus.running ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trading Symbols
            </label>
            <select
              multiple
              value={selectedSymbols}
              onChange={(e) => setSelectedSymbols(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Interval
            </label>
            <select
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {intervals.map(interval => (
                <option key={interval.value} value={interval.value}>{interval.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {botStatus.running ? (
              <button
                onClick={stopBot}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center disabled:opacity-50"
              >
                <Square className="w-4 h-4 mr-2" />
                {loading ? 'Stopping...' : 'Stop Bot'}
              </button>
            ) : (
              <button
                onClick={startBot}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center disabled:opacity-50"
              >
                <Play className="w-4 h-4 mr-2" />
                {loading ? 'Starting...' : 'Start Bot'}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Bot Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{botStatus.total_trades}</div>
            <div className="text-sm text-gray-500">Total Trades</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{(botStatus.win_rate * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Win Rate</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{botStatus.symbols.length}</div>
            <div className="text-sm text-gray-500">Active Symbols</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{selectedInterval}</div>
            <div className="text-sm text-gray-500">Interval</div>
          </div>
        </div>
      </div>

      {/* Trading Signals */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Live Trading Signals
        </h3>

        {Object.keys(signals).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(signals).map(([symbol, signal]) => {
              const signalDisplay = getSignalDisplay(signal.signal);
              return (
                <div key={symbol} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{symbol}</span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${signalDisplay.bg} ${signalDisplay.color}`}>
                      {signal.signal}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Confidence:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {(signal.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Price:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ${signal.price?.toFixed(4) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Time:</span>
                      <span className="text-sm text-gray-500">
                        {signal.timestamp ? new Date(signal.timestamp).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                    {signal.reason && (
                      <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {signal.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg mb-2">No signals generated yet</div>
            <div className="text-gray-400 text-sm">Start the bot to begin generating trading signals</div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Performance Metrics
        </h3>

        {performance.message ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">{performance.message}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{performance.total_trades || 0}</div>
              <div className="text-sm text-blue-600">Total Trades</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{performance.winning_trades || 0}</div>
              <div className="text-sm text-green-600">Winning Trades</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{performance.losing_trades || 0}</div>
              <div className="text-sm text-red-600">Losing Trades</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {performance.win_rate ? (performance.win_rate * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-purple-600">Win Rate</div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-yellow-600" />
          Notification Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="telegram"
              checked={notifications.telegram}
              onChange={(e) => setNotifications(prev => ({ ...prev, telegram: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="telegram" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 mr-2" />
              Telegram Notifications
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="email"
              checked={notifications.email}
              onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 mr-2" />
              Email Notifications
            </label>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Configure your notification preferences in the .env file with TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, and email settings.
        </div>
      </div>
    </div>
  );
};

export default AITradingBot;

