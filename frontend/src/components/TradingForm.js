import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { ArrowUp, ArrowDown, DollarSign, Hash } from 'lucide-react';
import { API_BASE_URL, ORDER_TYPES, ORDER_SIDES } from '../config';

const TradingForm = ({ symbol, currentPrice, onOrderPlaced }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSide, setSelectedSide] = useState('BUY');
  const [selectedType, setSelectedType] = useState('MARKET');
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();
  
  const watchQuantity = watch('quantity');
  const watchPrice = watch('price');

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      const orderData = {
        symbol: symbol,
        side: selectedSide,
        order_type: selectedType,
        quantity: parseFloat(data.quantity),
        price: selectedType === 'LIMIT' ? parseFloat(data.price) : null,
        time_in_force: 'GTC'
      };

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.orderId) {
        toast.success(`${selectedSide} order placed successfully!`);
        reset();
        onOrderPlaced();
      } else {
        toast.error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    if (!watchQuantity || !watchPrice) return 0;
    return (parseFloat(watchQuantity) * parseFloat(watchPrice)).toFixed(2);
  };

  const getSideColor = (side) => {
    return side === 'BUY' ? 'success-green' : 'error-red';
  };

  const getSideIcon = (side) => {
    return side === 'BUY' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-4">Place Order</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Order Side Selection */}
        <div className="flex rounded-lg bg-binance-gray p-1">
          {ORDER_SIDES.map((side) => (
            <button
              key={side.value}
              type="button"
              onClick={() => setSelectedSide(side.value)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                selectedSide === side.value
                  ? `bg-${getSideColor(side.value)} text-white`
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {getSideIcon(side.value)}
              <span>{side.label}</span>
            </button>
          ))}
        </div>

        {/* Order Type Selection */}
        <div className="flex rounded-lg bg-binance-gray p-1">
          {ORDER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelectedType(type.value)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedType === type.value
                  ? 'bg-binance-yellow text-binance-darker'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Hash className="w-4 h-4 inline mr-2" />
            Quantity
          </label>
          <input
            type="number"
            step="0.0001"
            {...register('quantity', { 
              required: 'Quantity is required',
              min: { value: 0.0001, message: 'Quantity must be greater than 0' }
            })}
            className="w-full px-3 py-2 bg-binance-gray border border-binance-light-gray text-white rounded-md form-input"
            placeholder="0.0000"
          />
          {errors.quantity && (
            <p className="text-error-red text-sm mt-1">{errors.quantity.message}</p>
          )}
        </div>

        {/* Price Input (for Limit Orders) */}
        {selectedType === 'LIMIT' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Price
            </label>
            <input
              type="number"
              step="0.01"
              {...register('price', { 
                required: 'Price is required for limit orders',
                min: { value: 0.01, message: 'Price must be greater than 0' }
              })}
              className="w-full px-3 py-2 bg-binance-gray border border-binance-light-gray text-white rounded-md form-input"
              placeholder={currentPrice ? currentPrice.toFixed(2) : "0.00"}
            />
            {errors.price && (
              <p className="text-error-red text-sm mt-1">{errors.price.message}</p>
            )}
          </div>
        )}

        {/* Market Price Display */}
        {selectedType === 'MARKET' && currentPrice && (
          <div className="p-3 bg-binance-gray/50 border border-binance-light-gray rounded-md">
            <p className="text-sm text-gray-400">Market Price</p>
            <p className="text-lg font-medium text-white">${currentPrice.toFixed(2)}</p>
          </div>
        )}

        {/* Total Calculation */}
        {selectedType === 'LIMIT' && watchQuantity && watchPrice && (
          <div className="p-3 bg-binance-gray/50 border border-binance-light-gray rounded-md">
            <p className="text-sm text-gray-400">Total Value</p>
            <p className="text-lg font-medium text-white">${calculateTotal()}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedSide === 'BUY' 
              ? 'bg-success-green hover:bg-success-green/90' 
              : 'bg-error-red hover:bg-error-red/90'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Placing Order...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              {getSideIcon(selectedSide)}
              <span>{selectedSide} {symbol}</span>
            </div>
          )}
        </button>

        {/* Order Summary */}
        <div className="text-xs text-gray-400 text-center">
          <p>Order Type: {selectedType}</p>
          <p>Side: {selectedSide}</p>
          <p>Symbol: {symbol}</p>
        </div>
      </form>
    </div>
  );
};

export default TradingForm;




