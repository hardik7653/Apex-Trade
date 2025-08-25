// API Configuration
export const API_BASE_URL = 'http://localhost:5000';

// Trading Pairs
export const TRADING_PAIRS = [
  'BTCUSDT',
  'ETHUSDT', 
  'BNBUSDT',
  'ADAUSDT',
  'DOTUSDT',
  'LINKUSDT',
  'LTCUSDT',
  'BCHUSDT',
  'XRPUSDT',
  'SOLUSDT'
];

// Chart Intervals
export const CHART_INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' }
];

// Order Types
export const ORDER_TYPES = [
  { value: 'MARKET', label: 'Market' },
  { value: 'LIMIT', label: 'Limit' }
];

// Order Sides
export const ORDER_SIDES = [
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' }
];

// WebSocket URLs
export const WEBSOCKET_URLS = {
  live: 'wss://stream.binance.com:9443/ws',
  testnet: 'wss://testnet.binance.vision/ws'
};

// API Endpoints
export const API_ENDPOINTS = {
  connect: '/api/connect',
  balances: '/api/balances',
  orders: '/api/orders',
  trades: '/api/trades',
  orderbook: '/api/orderbook',
  klines: '/api/klines'
};

