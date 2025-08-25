'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import api from '@/lib/api';

const AccountOverview = () => {
  const { resolvedTheme } = useTheme();
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);
  const [dailyChangePercent, setDailyChangePercent] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAccountInfo();
    const interval = setInterval(loadAccountInfo, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAccountInfo = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await api.post('/trade', { action: 'getAccount' });
      if (response.data?.ok) {
        const account = response.data.data.account;
        setAccountInfo(account);
        
        // Calculate portfolio value from real balances
        let totalValue = account.cash || 0;
        let totalChange = 0;
        
        // For demo purposes, simulate some price changes
        // In production, this would fetch real-time prices from Binance
        Object.entries(account.positions || {}).forEach(([asset, amount]: [string, any]) => {
          if (amount > 0) {
            // Simulate price changes for demo
            const basePrice = asset === 'BTC' ? 30000 : asset === 'ETH' ? 2000 : asset === 'ADA' ? 0.5 : 1;
            const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
            const currentPrice = basePrice * (1 + priceChange);
            totalValue += amount * currentPrice;
            totalChange += amount * basePrice * priceChange;
          }
        });
        
        setPortfolioValue(totalValue);
        setDailyChange(totalChange);
        setDailyChangePercent((totalChange / (totalValue - totalChange)) * 100);
      }
    } catch (error) {
      console.error('Failed to load account info:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPositionColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getPositionIcon = (amount: number) => {
    if (amount > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (amount < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Portfolio Overview
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your trading account summary
              </p>
            </div>
          </div>
          <button
            onClick={() => loadAccountInfo(true)}
            disabled={refreshing}
            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Portfolio Value */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatCurrency(portfolioValue)}
          </div>
          <div className="flex items-center justify-center gap-2">
            {dailyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={cn(
              "text-sm font-medium",
              dailyChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {dailyChange >= 0 ? '+' : ''}{formatCurrency(dailyChange)} ({dailyChange >= 0 ? '+' : ''}{formatPercentage(dailyChangePercent / 100)})
            </span>
          </div>
        </div>

        {/* Account Details */}
        {accountInfo && (
          <div className="space-y-4">
            {/* USDT Balance */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Available USDT</div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(accountInfo.cash || 0)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-600 dark:text-blue-400">Liquid</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Ready to trade</div>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Current Positions
              </h4>
              <div className="space-y-3">
                {Object.entries(accountInfo.positions || {}).length > 0 ? (
                  Object.entries(accountInfo.positions || {}).map(([asset, amount]: [string, any]) => (
                    <div key={asset} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          amount > 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                        )}>
                          {getPositionIcon(amount)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{asset}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {amount > 0 ? 'Long' : amount < 0 ? 'Short' : 'Neutral'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("font-semibold", getPositionColor(amount))}>
                          {amount > 0 ? '+' : ''}{formatNumber(amount, 4)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {/* Estimated value - in production this would be real-time */}
                          {formatCurrency(Math.abs(amount) * (asset === 'BTC' ? 30000 : asset === 'ETH' ? 2000 : asset === 'ADA' ? 0.5 : 1))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No open positions</p>
                    <p className="text-xs">Start trading to see your positions here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Account Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {accountInfo.account_type || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Permissions:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {accountInfo.permissions?.includes('SPOT') ? 'Spot Trading' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Stats */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Trading Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {accountInfo.total_trades || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Trades</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {Object.keys(accountInfo.positions || {}).length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Active Positions</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AccountOverview;
