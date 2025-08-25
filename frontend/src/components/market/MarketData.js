import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const MarketData = () => {
  const { getMarketData, marketData } = useTrading();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [loading, setLoading] = useState(false);

  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];

  useEffect(() => {
    loadMarketData();
  }, [selectedSymbol, interval]);

  const loadMarketData = async () => {
    setLoading(true);
    try {
      await getMarketData(selectedSymbol, interval, 100);
    } catch (error) {
      console.error('Failed to load market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentData = marketData[selectedSymbol];
  const latestPrice = currentData?.iloc[-1]?.close || 0;
  const previousPrice = currentData?.iloc[-2]?.close || 0;
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Market Data</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time cryptocurrency market information
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Symbol
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interval
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {intervals.map((int) => (
                <option key={int} value={int}>{int}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{selectedSymbol}</h3>
            <div className="flex items-center mt-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${latestPrice.toFixed(2)}
              </span>
              <div className={`ml-3 flex items-center text-sm ${
                priceChange >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {priceChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {priceChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">24h Change</div>
            <div className={`text-lg font-medium ${
              priceChange >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              ${priceChange.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Price Chart</h3>
        <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
          ) : currentData ? (
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">
                Chart data loaded for {selectedSymbol}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {currentData.length} data points available
              </p>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-gray-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Volume</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {currentData?.iloc[-1]?.volume?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-gray-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">High</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                ${currentData?.iloc[-1]?.high?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <TrendingDown className="h-6 w-6 text-gray-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                ${currentData?.iloc[-1]?.low?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketData;



