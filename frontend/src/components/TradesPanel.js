import React from 'react';
import { Activity, ArrowUp, ArrowDown } from 'lucide-react';

const TradesPanel = ({ trades }) => {
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  const formatQuantity = (quantity) => {
    return parseFloat(quantity).toFixed(4);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSideIcon = (side) => {
    return side === 'BUY' ? (
      <ArrowUp className="w-3 h-3 text-success-green" />
    ) : (
      <ArrowDown className="w-3 h-3 text-error-red" />
    );
  };

  const getSideColor = (side) => {
    return side === 'BUY' ? 'text-success-green' : 'text-error-red';
  };

  return (
    <div className="bg-binance-dark border border-binance-gray rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-binance-yellow" />
        <h3 className="text-lg font-medium text-white">Recent Trades</h3>
        <span className="ml-auto text-sm text-gray-400">
          {trades.length} trades
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-binance-gray rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-gray-500 text-sm">No recent trades</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {trades.slice(0, 20).map((trade, index) => (
            <div
              key={`${trade.id}-${index}`}
              className="flex items-center justify-between p-2 bg-binance-gray/30 rounded-lg border border-binance-light-gray/30 hover:bg-binance-gray/50 transition-colors"
            >
              {/* Trade Side and Price */}
              <div className="flex items-center space-x-2">
                {getSideIcon(trade.isBuyerMaker ? 'SELL' : 'BUY')}
                <div>
                  <p className={`text-sm font-medium ${getSideColor(trade.isBuyerMaker ? 'SELL' : 'BUY')}`}>
                    ${formatPrice(trade.price)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatTime(trade.time)}
                  </p>
                </div>
              </div>

              {/* Trade Quantity */}
              <div className="text-right">
                <p className="text-sm text-white font-medium">
                  {formatQuantity(trade.qty)}
                </p>
                <p className="text-xs text-gray-400">
                  ${(parseFloat(trade.price) * parseFloat(trade.qty)).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trade Summary */}
      {trades.length > 0 && (
        <div className="mt-4 pt-3 border-t border-binance-light-gray">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <p className="text-gray-400">Total Trades</p>
              <p className="text-white font-medium">{trades.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">Last Trade</p>
              <p className="text-white font-medium">
                {trades.length > 0 ? formatTime(trades[0].time) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradesPanel;




