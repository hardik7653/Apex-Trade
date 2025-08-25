import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const TradingContext = createContext();

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};

export const TradingProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [botStatus, setBotStatus] = useState({
    running: false,
    symbols: [],
    last_signal: null,
    total_trades: 0,
    win_rate: 0.0,
    total_pnl: 0.0,
    current_balance: 0.0
  });
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [performance, setPerformance] = useState({});
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to trading bot');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from trading bot');
    });

    newSocket.on('signal_update', (data) => {
      console.log('Signal update:', data);
      setSignals(prev => [...prev, data]);
      toast.success(`New signal: ${data.signal.signal} for ${data.symbol}`);
    });

    newSocket.on('trade_update', (data) => {
      console.log('Trade update:', data);
      setTrades(prev => [...prev, data]);
      toast.success(`Trade executed: ${data.side} ${data.quantity} ${data.symbol}`);
    });

    newSocket.on('bot_status_update', (data) => {
      console.log('Bot status update:', data);
      setBotStatus(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // API Functions
  const trainModels = async (symbols) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/train-models', { symbols });
      
      if (response.data.success) {
        toast.success('Models trained successfully');
        return response.data;
      } else {
        throw new Error('Training failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const startTrading = async (symbols) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/start-trading', { symbols });
      
      if (response.data.success) {
        toast.success('Trading bot started');
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to start trading');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const stopTrading = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/stop-trading');
      
      if (response.data.success) {
        toast.success('Trading bot stopped');
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to stop trading');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getBotStatus = async () => {
    try {
      const response = await axios.get('/api/bot-status');
      setBotStatus(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching bot status:', error);
    }
  };

  const getSignals = async () => {
    try {
      const response = await axios.get('/api/signals');
      setSignals(response.data.signals || []);
      return response.data.signals;
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const getTrades = async () => {
    try {
      const response = await axios.get('/api/trades');
      setTrades(response.data.trades || []);
      return response.data.trades;
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const getPerformance = async () => {
    try {
      const response = await axios.get('/api/performance');
      setPerformance(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const getMarketData = async (symbol, interval = '1h', limit = 100) => {
    try {
      const response = await axios.get(`/api/market-data/${symbol}`, {
        params: { interval, limit }
      });
      
      if (response.data.success) {
        setMarketData(prev => ({
          ...prev,
          [symbol]: response.data.data
        }));
        return response.data.data;
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  };

  const placeOrder = async (orderData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/place-order', orderData);
      
      if (response.data.success) {
        toast.success('Order placed successfully');
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to place order');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateSignal = async (symbol) => {
    try {
      const response = await axios.get(`/api/generate-signal/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Error generating signal:', error);
      throw error;
    }
  };

  // Subscribe to real-time updates
  const subscribeToUpdates = () => {
    if (socket) {
      socket.emit('subscribe_signals');
    }
  };

  const value = {
    // State
    botStatus,
    signals,
    trades,
    performance,
    marketData,
    loading,
    
    // Actions
    trainModels,
    startTrading,
    stopTrading,
    getBotStatus,
    getSignals,
    getTrades,
    getPerformance,
    getMarketData,
    placeOrder,
    generateSignal,
    subscribeToUpdates
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};



