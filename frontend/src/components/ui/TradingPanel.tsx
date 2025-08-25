'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import api from '@/lib/api';

interface TradingPanelProps {
  symbol: string;
  onTradeSuccess: () => void;
}

const TradingPanel: React.FC<TradingPanelProps> = ({ symbol, onTradeSuccess }) => {
  const { push } = useToast();
  const { resolvedTheme } = useTheme();
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [orderBook, setOrderBook] = useState<any>(null);
  const [orderBookLoading, setOrderBookLoading] = useState(false);

  useEffect(() => {
    loadAccountInfo();
    loadCurrentPrice();
    if (showOrderBook) {
      loadOrderBook();
    }
  }, [symbol, showOrderBook]);

  const loadAccountInfo = async () => {
    try {
      const response = await api.post('/trade', { action: 'getAccount' });
      if (response.data?.ok) {
        setAccountInfo(response.data.data.account);
      }
    } catch (error) {
      console.error('Failed to load account info:', error);
    }
  };

  const loadCurrentPrice = async () => {
    try {
      const response = await api.get(`/klines/${symbol}/latest`);
      if (response.data?.ok) {
        setCurrentPrice(parseFloat(response.data.kline.close));
      }
    } catch (error) {
      console.error('Failed to load current price:', error);
    }
  };

  const loadOrderBook = async () => {
    try {
      setOrderBookLoading(true);
      const response = await api.get(`/klines/${symbol}/orderbook?limit=20`);
      if (response.data?.ok) {
        setOrderBook(response.data.orderbook);
      }
    } catch (error) {
      console.error('Failed to load order book:', error);
    } finally {
      setOrderBookLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!amount || (orderType === 'limit' && !price)) {
      push({ msg: 'Please fill in all required fields', type: 'error' });
      return;
    }

    if (parseFloat(amount) <= 0) {
      push({ msg: 'Amount must be greater than 0', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const tradeData = {
        action: 'placeOrder',
        symbol: symbol,
        side: side,
        volume: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : undefined,
        order_type: orderType.toUpperCase(),
      };

      const response = await api.post('/trade', tradeData);
      if (response.data?.ok) {
        push({ 
          msg: `${side} order placed successfully for ${amount} ${symbol}`, 
          type: 'success' 
        });
        onTradeSuccess();
        setAmount('');
        setPrice('');
        loadAccountInfo();
      }
    } catch (error: any) {
      push({ 
        msg: error.response?.data?.detail || 'Failed to place order', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = orderType === 'limit' ? (parseFloat(price) || 0) : currentPrice;
    return amountNum * priceNum;
  };

  const getEstimatedPrice = () => {
    if (orderType === 'limit' && price) {
      return parseFloat(price);
    }
    return currentPrice;
  };

  const formatOrderBookSide = (orders: any[], side: 'bids' | 'asks') => {
    return orders.slice(0, 10).map((order, index) => (
      <div
        key={index}
        className={cn(
          "flex justify-between text-xs py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
          side === 'bids' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}
        onClick={() => {
          if (side === 'bids') {
            setPrice(order[0].toString());
            setSide('SELL');
          } else {
            setPrice(order[0].toString());
            setSide('BUY');
          }
        }}
      >
        <span>{parseFloat(order[0]).toFixed(4)}</span>
        <span>{parseFloat(order[1]).toFixed(4)}</span>
      </div>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Trading Panel
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Execute trades with real-time market data
        </p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Order Type
              </label>
              <div className="flex space-x-2">
                {['market', 'limit'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type as 'market' | 'limit')}
                    className={cn(
                      "flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border",
                      orderType === type
                        ? "bg-blue-500 text-white border-blue-500 shadow-md"
                        : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Buy/Sell Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Trade Side
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['BUY', 'SELL'].map((tradeSide) => (
                  <button
                    key={tradeSide}
                    onClick={() => setSide(tradeSide as 'BUY' | 'SELL')}
                    className={cn(
                      "px-4 py-4 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                      side === tradeSide
                        ? tradeSide === 'BUY'
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                          : "bg-red-500 text-white shadow-lg shadow-red-500/25"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                  >
                    {tradeSide === 'BUY' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {tradeSide}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Amount ({symbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  {symbol}
                </div>
              </div>
            </div>

            {/* Price Input (for limit orders) */}
            {orderType === 'limit' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Price (USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    USD
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            {amount && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Estimated Price:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(getEstimatedPrice())}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            {/* Execute Trade Button */}
            <button
              onClick={handleTrade}
              disabled={loading || !amount || (orderType === 'limit' && !price)}
              className={cn(
                "w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : side === 'BUY'
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25"
                  : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25"
              )}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Execute ${side} Order`
              )}
            </button>
          </div>

          {/* Market Info & Order Book */}
          <div className="space-y-6">
            {/* Current Price Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Current {symbol} Price
              </h4>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {currentPrice > 0 ? formatCurrency(currentPrice) : 'Loading...'}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                Real-time market data
              </div>
            </div>

            {/* Order Book Toggle */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <button
                onClick={() => setShowOrderBook(!showOrderBook)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <span>Order Book</span>
                {showOrderBook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Order Book */}
            {showOrderBook && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Book</h4>
                {orderBookLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : orderBook ? (
                  <div className="space-y-2">
                    {/* Asks (Sell Orders) */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Asks</div>
                    {formatOrderBookSide(orderBook.asks, 'asks')}
                    
                    {/* Spread */}
                    <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                      <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                        Spread: {orderBook.asks[0] && orderBook.bids[0] 
                          ? ((orderBook.asks[0][0] - orderBook.bids[0][0]) / orderBook.bids[0][0] * 100).toFixed(4) + '%'
                          : 'N/A'
                        }
                      </div>
                    </div>
                    
                    {/* Bids (Buy Orders) */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Bids</div>
                    {formatOrderBookSide(orderBook.bids, 'bids')}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    No order book data
                  </div>
                )}
              </div>
            )}

            {/* Account Overview */}
            {accountInfo && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Account Balance
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Available USDT:</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(accountInfo.cash || 0)}
                    </span>
                  </div>
                  
                  {Object.entries(accountInfo.positions || {}).map(([asset, amount]: [string, any]) => (
                    <div key={asset} className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{asset}:</span>
                      <span className={cn(
                        "text-lg font-semibold",
                        amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {amount > 0 ? '+' : ''}{formatNumber(amount, 4)}
                      </span>
                    </div>
                  ))}
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                    Total Trades: {accountInfo.total_trades || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Trading Tips */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Trading Tips</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Always verify order details before execution</li>
                    <li>• Monitor your positions and set stop-losses</li>
                    <li>• Keep track of your trading performance</li>
                    <li>• Use limit orders for better price control</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TradingPanel;
