import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import PriceChart from './PriceChart';
import OrderBook from './OrderBook';
import TradingForm from './TradingForm';
import BalancesPanel from './BalancesPanel';
import OrdersPanel from './OrdersPanel';
import TradesPanel from './TradesPanel';
import { API_BASE_URL } from '../config';

const TradingDashboard = ({
  selectedSymbol,
  balances,
  orders,
  trades,
  onRefreshBalances,
  onRefreshOrders,
  onRefreshTrades
}) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState({ change: 0, changePercent: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchOrderBook();
    fetchCurrentPrice();
    
    // Set up real-time price updates
    const interval = setInterval(fetchCurrentPrice, 5000);
    
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const fetchOrderBook = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orderbook/${selectedSymbol}?limit=20`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const bids = data.filter(item => item[0] === 'bids').flatMap(item => item[1]).slice(0, 10);
        const asks = data.filter(item => item[0] === 'asks').flatMap(item => item[1]).slice(0, 10);
        
        setOrderBook({ bids, asks });
      }
    } catch (error) {
      console.error('Error fetching order book:', error);
    }
  };

  const fetchCurrentPrice = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/klines/${selectedSymbol}?interval=1m&limit=2`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length >= 2) {
        const current = parseFloat(data[data.length - 1][4]); // Close price
        const previous = parseFloat(data[data.length - 2][4]); // Previous close price
        
        setCurrentPrice(current);
        setPriceChange({
          change: current - previous,
          changePercent: ((current - previous) / previous) * 100
        });
      }
    } catch (error) {
      console.error('Error fetching current price:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        onRefreshBalances(),
        onRefreshOrders(),
        onRefreshTrades(),
        fetchOrderBook()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceColor = () => {
    if (priceChange.change > 0) return 'text-success-green';
    if (priceChange.change < 0) return 'text-error-red';
    return 'text-gray-400';
  };

  const getPriceIcon = () => {
    if (priceChange.change > 0) return <TrendingUp className="w-4 h-4" />;
    if (priceChange.change < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header with Price Info */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedSymbol}</h1>
            {currentPrice && (
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-3xl font-bold text-white">
                  ${currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center space-x-2 ${getPriceColor()}`}>
                  {getPriceIcon()}
                  <span className="text-lg font-medium">
                    {priceChange.change > 0 ? '+' : ''}{priceChange.change.toFixed(2)}
                  </span>
                  <span className="text-sm">
                    ({priceChange.changePercent > 0 ? '+' : ''}{priceChange.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-binance-gray text-gray-300 rounded-md hover:bg-binance-light-gray transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Trading Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Balances and Orders */}
        <div className="lg:col-span-1 space-y-6">
          <BalancesPanel balances={balances} />
          <OrdersPanel orders={orders} onRefresh={onRefreshOrders} />
        </div>

        {/* Center - Chart and Trading Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-binance-dark border border-binance-gray rounded-lg p-4">
            <PriceChart symbol={selectedSymbol} />
          </div>
          
          <div className="bg-binance-dark border border-binance-gray rounded-lg p-4">
            <TradingForm 
              symbol={selectedSymbol}
              currentPrice={currentPrice}
              onOrderPlaced={() => {
                onRefreshBalances();
                onRefreshOrders();
              }}
            />
          </div>
        </div>

        {/* Right Sidebar - Order Book and Recent Trades */}
        <div className="lg:col-span-1 space-y-6">
          <OrderBook orderBook={orderBook} />
          <TradesPanel trades={trades} />
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;




