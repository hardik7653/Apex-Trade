import React from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

const BalancesPanel = ({ balances }) => {
  const formatBalance = (balance) => {
    if (balance >= 1000) {
      return (balance / 1000).toFixed(2) + 'K';
    } else if (balance >= 1) {
      return balance.toFixed(4);
    } else {
      return balance.toFixed(6);
    }
  };

  const getTotalValue = () => {
    return balances.reduce((total, balance) => {
      // For USDT, use 1:1 ratio, for others estimate (this is simplified)
      if (balance.asset === 'USDT') {
        return total + balance.total;
      }
      // For crypto assets, you would typically get current prices
      // For now, we'll just show the raw balance
      return total + balance.total;
    }, 0);
  };

  return (
    <div className="bg-binance-dark border border-binance-gray rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Wallet className="w-5 h-5 text-binance-yellow" />
        <h3 className="text-lg font-medium text-white">Balances</h3>
      </div>

      {balances.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-binance-gray rounded-full flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-gray-500 text-sm">No balances available</p>
        </div>
      ) : (
        <>
          {/* Total Value */}
          <div className="mb-4 p-3 bg-binance-gray/50 border border-binance-light-gray rounded-lg">
            <p className="text-sm text-gray-400">Total Value</p>
            <p className="text-xl font-bold text-white">${getTotalValue().toFixed(2)}</p>
          </div>

          {/* Individual Balances */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {balances.map((balance) => (
              <div
                key={balance.asset}
                className="flex items-center justify-between p-3 bg-binance-gray/30 rounded-lg border border-binance-light-gray/30 hover:bg-binance-gray/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-binance-yellow/20 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-binance-yellow">
                      {balance.asset.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{balance.asset}</p>
                    <p className="text-xs text-gray-400">
                      Free: {formatBalance(balance.free)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-white">
                    {formatBalance(balance.total)}
                  </p>
                  {balance.locked > 0 && (
                    <p className="text-xs text-warning-orange">
                      Locked: {formatBalance(balance.locked)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="text-center p-2 bg-binance-gray/30 rounded">
              <p className="text-gray-400">Assets</p>
              <p className="text-white font-medium">{balances.length}</p>
            </div>
            <div className="text-center p-2 bg-binance-gray/30 rounded">
              <p className="text-gray-400">Total</p>
              <p className="text-white font-medium">{balances.length}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BalancesPanel;




