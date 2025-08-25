import React, { useState } from 'react';
import { Clock, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const OrdersPanel = ({ orders, onRefresh }) => {
  const [cancellingOrder, setCancellingOrder] = useState(null);

  const handleCancelOrder = async (orderId, symbol) => {
    setCancellingOrder(orderId);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}?symbol=${symbol}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.orderId) {
        toast.success('Order cancelled successfully');
        onRefresh();
      } else {
        toast.error(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrder(null);
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  const formatQuantity = (quantity) => {
    return parseFloat(quantity).toFixed(4);
  };

  const getSideIcon = (side) => {
    return side === 'BUY' ? (
      <ArrowUp className="w-4 h-4 text-success-green" />
    ) : (
      <ArrowDown className="w-4 h-4 text-error-red" />
    );
  };

  const getSideColor = (side) => {
    return side === 'BUY' ? 'text-success-green' : 'text-error-red';
  };

  const getOrderTypeColor = (type) => {
    return type === 'MARKET' ? 'bg-warning-orange/20 text-warning-orange' : 'bg-binance-yellow/20 text-binance-yellow';
  };

  return (
    <div className="bg-binance-dark border border-binance-gray rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-5 h-5 text-binance-yellow" />
        <h3 className="text-lg font-medium text-white">Open Orders</h3>
        <span className="ml-auto text-sm text-gray-400">
          {orders.length} orders
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-binance-gray rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-gray-500 text-sm">No open orders</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {orders.map((order) => (
            <div
              key={order.orderId}
              className="p-3 bg-binance-gray/30 rounded-lg border border-binance-light-gray/30 hover:bg-binance-gray/50 transition-colors"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getSideIcon(order.side)}
                  <span className={`font-medium ${getSideColor(order.side)}`}>
                    {order.side}
                  </span>
                  <span className="text-white">{order.symbol}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderTypeColor(order.type)}`}>
                    {order.type}
                  </span>
                  
                  <button
                    onClick={() => handleCancelOrder(order.orderId, order.symbol)}
                    disabled={cancellingOrder === order.orderId}
                    className="p-1 text-gray-400 hover:text-error-red transition-colors disabled:opacity-50"
                    title="Cancel Order"
                  >
                    {cancellingOrder === order.orderId ? (
                      <div className="w-4 h-4 border-2 border-error-red border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">Price</p>
                  <p className="text-white font-medium">
                    ${formatPrice(order.price)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Quantity</p>
                  <p className="text-white font-medium">
                    {formatQuantity(order.origQty)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Filled</p>
                  <p className="text-white font-medium">
                    {formatQuantity(order.executedQty)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Remaining</p>
                  <p className="text-white font-medium">
                    {formatQuantity(order.origQty - order.executedQty)}
                  </p>
                </div>
              </div>

              {/* Order Status */}
              <div className="mt-2 pt-2 border-t border-binance-light-gray/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Status: {order.status}</span>
                  <span className="text-gray-400">
                    {new Date(order.time).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPanel;




