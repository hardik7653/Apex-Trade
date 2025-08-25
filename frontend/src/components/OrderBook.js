import React from 'react';
import { BookOpen, ArrowUp, ArrowDown } from 'lucide-react';

const OrderBook = ({ orderBook }) => {
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  const formatQuantity = (quantity) => {
    return parseFloat(quantity).toFixed(4);
  };

  const calculateTotal = (price, quantity) => {
    return (parseFloat(price) * parseFloat(quantity)).toFixed(2);
  };

  return (
    <div className="bg-binance-dark border border-binance-gray rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <BookOpen className="w-5 h-5 text-binance-yellow" />
        <h3 className="text-lg font-medium text-white">Order Book</h3>
      </div>

      {(!orderBook.asks || orderBook.asks.length === 0) && (!orderBook.bids || orderBook.bids.length === 0) ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-binance-gray rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-gray-500 text-sm">No order book data</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Asks (Sell Orders) */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <ArrowDown className="w-4 h-4 text-error-red" />
              <h4 className="text-sm font-medium text-error-red">Asks (Sell)</h4>
            </div>
            
            <div className="space-y-1">
              {orderBook.asks && orderBook.asks.slice(0, 8).map((ask, index) => (
                <div
                  key={`ask-${index}`}
                  className="flex items-center justify-between p-2 bg-error-red/10 border-l-2 border-error-red rounded-r hover:bg-error-red/20 transition-colors order-book-row sell-row"
                >
                  <div className="flex-1 text-right">
                    <span className="text-error-red font-medium">
                      ${formatPrice(ask[0])}
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-gray-300">
                      {formatQuantity(ask[1])}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-gray-400 text-sm">
                      ${calculateTotal(ask[0], ask[1])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spread */}
          {orderBook.asks && orderBook.bids && orderBook.asks.length > 0 && orderBook.bids.length > 0 && (
            <div className="text-center py-2 bg-binance-gray/50 rounded-lg border border-binance-light-gray">
              <p className="text-xs text-gray-400">Spread</p>
              <p className="text-sm text-white font-medium">
                ${(parseFloat(orderBook.asks[0][0]) - parseFloat(orderBook.bids[0][0])).toFixed(2)}
              </p>
            </div>
          )}

          {/* Bids (Buy Orders) */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <ArrowUp className="w-4 h-4 text-success-green" />
              <h4 className="text-sm font-medium text-success-green">Bids (Buy)</h4>
            </div>
            
            <div className="space-y-1">
              {orderBook.bids && orderBook.bids.slice(0, 8).map((bid, index) => (
                <div
                  key={`bid-${index}`}
                  className="flex items-center justify-between p-2 bg-success-green/10 border-l-2 border-success-green rounded-r hover:bg-success-green/20 transition-colors order-book-row buy-row"
                >
                  <div className="flex-1 text-right">
                    <span className="text-success-green font-medium">
                      ${formatPrice(bid[0])}
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-gray-300">
                      {formatQuantity(bid[1])}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-gray-400 text-sm">
                      ${calculateTotal(bid[0], bid[1])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Book Header */}
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-400 border-t border-binance-light-gray pt-3">
            <div className="text-right">Price</div>
            <div className="text-center">Quantity</div>
            <div className="text-left">Total</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBook;




