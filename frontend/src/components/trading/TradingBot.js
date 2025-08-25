import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { 
  Bot, 
  Play, 
  Square, 
  RefreshCw, 
  Brain, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  Activity
} from 'lucide-react';

const TradingBot = () => {
  const { 
    botStatus, 
    signals, 
    trades, 
    loading,
    trainModels,
    startTrading,
    stopTrading,
    generateSignal,
    getBotStatus,
    getSignals,
    getTrades
  } = useTrading();

  const [selectedSymbols, setSelectedSymbols] = useState(['BTCUSDT', 'ETHUSDT']);
  const [trainingStatus, setTrainingStatus] = useState({});
  const [isStarting, setIsStarting] = useState(false);
  const [testSymbol, setTestSymbol] = useState('BTCUSDT');

  useEffect(() => {
    getBotStatus();
    getSignals();
    getTrades();
  }, []);

  const handleTrainModels = async () => {
    if (selectedSymbols.length === 0) {
      alert('Please select at least one symbol');
      return;
    }

    setTrainingStatus({ training: true, message: 'Training models...' });
    
    try {
      const result = await trainModels(selectedSymbols);
      setTrainingStatus({ 
        training: false, 
        success: true, 
        message: 'Models trained successfully!',
        results: result.results 
      });
    } catch (error) {
      setTrainingStatus({ 
        training: false, 
        success: false, 
        message: error.message || 'Training failed' 
      });
    }
  };

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

  const handleGenerateSignal = async () => {
    try {
      const result = await generateSignal(testSymbol);
      console.log('Signal generated:', result);
    } catch (error) {
      console.error('Failed to generate signal:', error);
    }
  };

  const availableSymbols = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 
    'BNBUSDT', 'XRPUSDT', 'LTCUSDT', 'BCHUSDT', 'EOSUSDT'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Trading Bot</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure and control your automated trading bot
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => {
              getBotStatus();
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

      {/* Bot Status */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bot Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {botStatus.running ? 'Currently running' : 'Currently stopped'}
              </p>
            </div>
          </div>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            botStatus.running 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {botStatus.running ? (
              <CheckCircle className="h-4 w-4 mr-1" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-1" />
            )}
            {botStatus.running ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symbol Selection */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trading Symbols</h3>
          <div className="space-y-3">
            {availableSymbols.map((symbol) => (
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
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{symbol}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Selected: {selectedSymbols.length} symbols
          </p>
        </div>

        {/* Model Training */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Model Training</h3>
          
          {trainingStatus.training && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin mr-2" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  {trainingStatus.message}
                </span>
              </div>
            </div>
          )}

          {trainingStatus.success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  {trainingStatus.message}
                </span>
              </div>
            </div>
          )}

          {trainingStatus.success === false && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  {trainingStatus.message}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleTrainModels}
            disabled={trainingStatus.training || selectedSymbols.length === 0}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="h-4 w-4 mr-2" />
            {trainingStatus.training ? 'Training...' : 'Train Models'}
          </button>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Train ML models on historical data for better predictions
          </p>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trading Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleStartTrading}
            disabled={botStatus.running || isStarting || loading || selectedSymbols.length === 0}
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

          <button
            onClick={handleGenerateSignal}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Test Signal
          </button>
        </div>

        {/* Test Signal */}
        <div className="mt-4 flex items-center space-x-3">
          <label className="text-sm text-gray-700 dark:text-gray-300">Test Symbol:</label>
          <select
            value={testSymbol}
            onChange={(e) => setTestSymbol(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Signals
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {signals.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Trades
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {trades.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Symbols
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {botStatus.symbols?.length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Signals</h3>
          <div className="space-y-3">
            {signals.slice(-10).reverse().map((signal, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {signal.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(signal.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                    signal.signal === 'BUY' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : signal.signal === 'SELL'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {signal.signal}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Conf: {(signal.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
            {signals.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No signals generated yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Trades</h3>
          <div className="space-y-3">
            {trades.slice(-10).reverse().map((trade, index) => (
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
                    {trade.quantity} @ ${parseFloat(trade.price).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            {trades.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No trades executed yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingBot;



