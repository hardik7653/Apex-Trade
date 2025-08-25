import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL, CHART_INTERVALS } from '../config';

const PriceChart = ({ symbol }) => {
  const [chartData, setChartData] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [symbol, selectedInterval]);

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/klines/${symbol}?interval=${selectedInterval}&limit=100`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const formattedData = data.map((kline, index) => ({
          time: new Date(kline[0]).toLocaleTimeString(),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
          index
        }));
        
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-binance-dark border border-binance-gray rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          <p className="text-gray-400">Open: ${data.open.toFixed(2)}</p>
          <p className="text-gray-400">High: ${data.high.toFixed(2)}</p>
          <p className="text-gray-400">Low: ${data.low.toFixed(2)}</p>
          <p className="text-gray-400">Close: ${data.close.toFixed(2)}</p>
          <p className="text-gray-400">Volume: {data.volume.toFixed(4)}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-binance-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Price Chart</h3>
        
        {/* Interval Selector */}
        <div className="flex space-x-1">
          {CHART_INTERVALS.map((interval) => (
            <button
              key={interval.value}
              onClick={() => setSelectedInterval(interval.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedInterval === interval.value
                  ? 'bg-binance-yellow text-binance-darker font-medium'
                  : 'bg-binance-gray text-gray-400 hover:text-white hover:bg-binance-light-gray'
              }`}
            >
              {interval.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" />
            <XAxis 
              dataKey="time" 
              stroke="#6B7280"
              fontSize={12}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
              tick={{ fill: '#6B7280' }}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#F0B90B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#F0B90B' }}
            />
            
            {/* Volume Bars (simplified) */}
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#474A57"
              strokeWidth={1}
              dot={false}
              opacity={0.3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-400">Current Price</p>
          <p className="text-white font-medium">
            ${chartData.length > 0 ? chartData[chartData.length - 1].close.toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400">24h High</p>
          <p className="text-success-green font-medium">
            ${chartData.length > 0 ? Math.max(...chartData.map(d => d.high)).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400">24h Low</p>
          <p className="text-error-red font-medium">
            ${chartData.length > 0 ? Math.min(...chartData.map(d => d.low)).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400">Volume</p>
          <p className="text-white font-medium">
            {chartData.length > 0 ? chartData[chartData.length - 1].volume.toFixed(4) : '0.0000'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;




