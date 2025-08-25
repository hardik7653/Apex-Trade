import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Bot, 
  BarChart3,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const { 
    botStatus, 
    performance, 
    signals, 
    trades, 
    loading,
    getBotStatus, 
    getPerformance, 
    getSignals, 
    getTrades,
    startTrading,
    stopTrading
  } = useTrading();
  const { user } = useAuth();
  const [selectedSymbols, setSelectedSymbols] = useState(['BTCUSDT', 'ETHUSDT']);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Load initial data
    getBotStatus();
    getPerformance();
    getSignals();
    getTrades();
  }, []);

  const handleStartTrading = async () => {
    if (selectedSymbols.length === 0) {
      alert('Please select at least one symbol');
      return;
    }
    
    setIsStarting(true);
    try {
      await startTrading(selectedSymbols);
    } catch (error) {
      console.error('Failed to start trading:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTrading = async () => {
    try {
      await stopTrading();
    } catch (error) {
      console.error('Failed to stop trading:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-green-600 dark:text-green-400';
      case 'stopped':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'stopped':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Mock data for charts
  const performanceData = [
    { time: '00:00', pnl: 0 },
    { time: '04:00', pnl: 150 },
    { time: '08:00', pnl: 320 },
    { time: '12:00', pnl: 280 },
    { time: '16:00', pnl: 450 },
    { time: '20:00', pnl: 380 },
    { time: '24:00', pnl: 420 },
  ];

  const signalData = [
    { time: '00:00', signals: 0 },
    { time: '04:00', signals: 3 },
    { time: '08:00', signals: 7 },
    { time: '12:00', signals: 5 },
    { time: '16:00', signals: 9 },
    { time: '20:00', signals: 6 },
    { time: '24:00', signals: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your AI trading bot performance and market activity
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => {
              getBotStatus();
              getPerformance();
              getSignals();
              getTrades();
            }}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bot Status */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bot className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Bot Status
                  </dt>
                  <dd className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
                    {getStatusIcon(botStatus.running ? 'running' : 'stopped')}
                    <span className="ml-2 capitalize">
                      {botStatus.running ? 'Running' : 'Stopped'}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total P&L
                  </dt>
                  <dd className={`text-lg font-medium ${
                    performance.total_pnl >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    ${performance.total_pnl?.toFixed(2) || '0.00'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Win Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {(performance.win_rate * 100)?.toFixed(1) || '0.0'}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Trades
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {performance.total_trades || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trading Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Symbol Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trading Symbols
            </label>
            <div className="space-y-2">
              {['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'].map((symbol) => (
                <label key={symbol} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSymbols.includes(symbol)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSymbols([...selectedSymbols, symbol]);
                      } else {
                        setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{symbol}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleStartTrading}
              disabled={botStatus.running || isStarting || loading}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4 mr-2" />
              {isStarting ? 'Starting...' : 'Start Trading'}
            </button>
            
            <button
              onClick={handleStopTrading}
              disabled={!botStatus.running || loading}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Trading
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#6B7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="pnl" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Signals Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Signals Generated</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#6B7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="signals" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Signals</h3>
          <div className="space-y-3">
            {signals.slice(-5).reverse().map((signal, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {signal.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(signal.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                  signal.signal === 'BUY' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : signal.signal === 'SELL'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {signal.signal}
                </div>
              </div>
            ))}
            {signals.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No signals yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Trades</h3>
          <div className="space-y-3">
            {trades.slice(-5).reverse().map((trade, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {trade.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(trade.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    trade.side === 'BUY' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trade.side}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {trade.quantity} @ ${trade.price}
                  </div>
                </div>
              </div>
            ))}
            {trades.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No trades yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;



