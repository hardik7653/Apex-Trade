import React, { useState, useEffect, useCallback } from 'react';
import PriceChart from './PriceChart';
import OrderBook from './OrderBook';
import TradingForm from './TradingForm';
import BalancesPanel from './BalancesPanel';
import OrdersPanel from './OrdersPanel';
import TradesPanel from './TradesPanel';
import { API_BASE_URL } from '../config';

const TradingDashboard = ({ connection, selectedSymbol }) => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [balances, setBalances] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch current price and order book
  const fetchMarketData = useCallback(async () => {
    if (!selectedSymbol) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch current price
      const priceResponse = await fetch(`${API_BASE_URL}/api/orderbook/${selectedSymbol}?limit=1`);
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        if (priceData.bids && priceData.bids.length > 0) {
          setCurrentPrice(priceData.bids[0][0]);
        }
      }

      // Fetch order book
      const orderBookResponse = await fetch(`${API_BASE_URL}/api/orderbook/${selectedSymbol}?limit=20`);
      if (orderBookResponse.ok) {
        const orderBookData = await orderBookResponse.json();
        setOrderBook(orderBookData);
      }

      // Fetch recent trades
      const tradesResponse = await fetch(`${API_BASE_URL}/api/trades/${selectedSymbol}?limit=20`);
      if (tradesResponse.ok) {
        const tradesData = await tradesResponse.json();
        setRecentTrades(tradesData);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  // Fetch account data
  const fetchAccountData = useCallback(async () => {
    if (!connection.connected) return;

    try {
      // Fetch balances
      const balancesResponse = await fetch(`${API_BASE_URL}/api/balances`);
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json();
        setBalances(balancesData);
      }

      // Fetch open orders
      const ordersResponse = await fetch(`${API_BASE_URL}/api/orders?symbol=${selectedSymbol}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOpenOrders(ordersData);
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
    }
  }, [connection.connected, selectedSymbol]);

  // Auto-refresh market data
  useEffect(() => {
    if (selectedSymbol) {
      fetchMarketData();
      
      // Refresh every 5 seconds
      const interval = setInterval(fetchMarketData, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedSymbol, fetchMarketData]);

  // Auto-refresh account data
  useEffect(() => {
    if (connection.connected) {
      fetchAccountData();
      
      // Refresh every 10 seconds
      const interval = setInterval(fetchAccountData, 10000);
      return () => clearInterval(interval);
    }
  }, [connection.connected, fetchAccountData]);

  // Handle order placement
  const handleOrderPlaced = useCallback((orderData) => {
    console.log('Order placed:', orderData);
    // Refresh account data
    fetchAccountData();
  }, [fetchAccountData]);

  // Handle order cancellation
  const handleOrderCancelled = useCallback((orderData) => {
    console.log('Order cancelled:', orderData);
    // Refresh account data
    fetchAccountData();
  }, [fetchAccountData]);

  // Calculate total USDT value
  const totalUSDTValue = balances.reduce((total, balance) => {
    return total + (balance.usdt_value || 0);
  }, 0);

  if (!selectedSymbol) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No symbol selected</div>
          <div className="text-gray-400 text-sm">Please select a trading pair to view market data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {selectedSymbol} Market Overview
          </h2>
          <div className="flex items-center space-x-4">
            {currentPrice && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${parseFloat(currentPrice).toFixed(4)}
                </div>
                <div className="text-sm text-gray-500">
                  Current Price
                </div>
              </div>
            )}
            {lastUpdate && (
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  Last Update
                </div>
                <div className="text-xs text-gray-400">
                  {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading market data...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading market data</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Trading Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Price Chart</h3>
            </div>
            <div className="p-4">
              <PriceChart 
                symbol={selectedSymbol} 
                currentPrice={currentPrice}
                onDataUpdate={fetchMarketData}
              />
            </div>
          </div>

          {/* Trading Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Place Order</h3>
            </div>
            <div className="p-4">
              <TradingForm 
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                onOrderPlaced={handleOrderPlaced}
                connection={connection}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Order Book, Balances, Orders */}
        <div className="space-y-6">
          {/* Order Book */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Order Book</h3>
            </div>
            <div className="p-4">
              <OrderBook 
                orderBook={orderBook}
                loading={loading}
                symbol={selectedSymbol}
              />
            </div>
          </div>

          {/* Balances Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Balances</h3>
              {totalUSDTValue > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  Total Value: ${totalUSDTValue.toFixed(2)} USDT
                </div>
              )}
            </div>
            <div className="p-4">
              <BalancesPanel 
                balances={balances}
                loading={loading}
                connection={connection}
              />
            </div>
          </div>

          {/* Open Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Open Orders</h3>
            </div>
            <div className="p-4">
              <OrdersPanel 
                orders={openOrders}
                loading={loading}
                connection={connection}
                onOrderCancelled={handleOrderCancelled}
                symbol={selectedSymbol}
              />
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Trades</h3>
            </div>
            <div className="p-4">
              <TradesPanel 
                trades={recentTrades}
                loading={loading}
                symbol={selectedSymbol}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!connection.connected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Not Connected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                Please connect your Binance API to start trading.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingDashboard;


