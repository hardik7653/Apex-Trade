'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import BacktestingPanel from '../../components/backtesting/BacktestingPanel';

// Trading pair options
const TRADING_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
  'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'XRPUSDT', 'DOGEUSDT'
];

// Chart intervals
const INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' }
];

export default function Dashboard() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');

  // Check connection status on load
  useEffect(() => {
    checkConnection();
    fetchData();
    
    // Set up interval to refresh data
    const interval = setInterval(fetchData, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPair]);

  const checkConnection = async () => {
    try {
      const response = await api.get('/binance/status');
      if (response.data?.connected) {
        setIsConnected(true);
        setAccountInfo(response.data.account_info);
      } else {
        // Redirect to login if not connected
        router.push('/login');
      }
    } catch (error) {
      toast.error('Failed to check connection status');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    if (!isConnected) return;
    
    try {
      // Fetch signals
      const signalsRes = await api.get('/signals');
      if (signalsRes.data?.ok) {
        setSignals(signalsRes.data.signals || []);
      }
      
      // Fetch trades
      const tradesRes = await api.get('/trades');
      if (tradesRes.data?.ok) {
        setTrades(tradesRes.data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`py-4 px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ApexTrader Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <div className={`px-3 py-1 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        {/* Tab Navigation */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'trading' 
              ? `border-b-2 border-blue-500 text-blue-500` 
              : `text-gray-500 hover:text-gray-700`}`}
            onClick={() => setActiveTab('trading')}
          >
            Trading Dashboard
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'backtesting' 
              ? `border-b-2 border-blue-500 text-blue-500` 
              : `text-gray-500 hover:text-gray-700`}`}
            onClick={() => setActiveTab('backtesting')}
          >
            Backtesting
          </button>
        </div>

        {activeTab === 'trading' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Information */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Account Balance</h2>
            {accountInfo && accountInfo.balances ? (
              <div className="space-y-2">
                {accountInfo.balances.map((balance: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{balance.asset}</span>
                    <span className="font-medium">{balance.total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No balance information available</p>
            )}
          </div>

          {/* Trading Signals */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Trading Signals</h2>
            {signals.length > 0 ? (
              <div className="space-y-2">
                {signals.slice(0, 5).map((signal: any, index: number) => (
                  <div key={index} className={`p-3 rounded-md ${
                    signal.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 
                    signal.side === 'SELL' ? 'bg-red-500/20 text-red-400' : 
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    <div className="flex justify-between">
                      <span>{signal.symbol}</span>
                      <span className="font-bold">{signal.side}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Confidence: {(signal.confidence * 100).toFixed(2)}%</span>
                      <span>{new Date(signal.ts).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No signals available</p>
            )}
          </div>

          {/* Recent Trades */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
            {trades.length > 0 ? (
              <div className="space-y-2">
                {trades.slice(0, 5).map((trade: any, index: number) => (
                  <div key={index} className={`p-3 rounded-md ${
                    trade.side === 'BUY' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <div className="flex justify-between">
                      <span>{trade.symbol}</span>
                      <span className={trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                        {trade.side}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Price: {trade.price}</span>
                      <span>Qty: {trade.qty}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No trades available</p>
            )}
          </div>
        </div>

        {/* Chart Section */}
        <div className={`mt-6 p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Market Chart</h2>
            <div className="flex space-x-2">
              <select 
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className={`px-3 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                {TRADING_PAIRS.map(pair => (
                  <option key={pair} value={pair}>{pair}</option>
                ))}
              </select>
              <select 
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(e.target.value)}
                className={`px-3 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                {INTERVALS.map(interval => (
                  <option key={interval.value} value={interval.value}>{interval.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* TradingView Widget */}
          <div className="w-full h-[500px] rounded-md overflow-hidden">
            <div id="tradingview_widget" className="w-full h-full">
              {/* TradingView widget will be loaded here via useEffect */}
              <iframe
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE:${selectedPair}&interval=${selectedInterval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=rgba(0, 0, 0, 0)&theme=${isDarkMode ? 'dark' : 'light'}&style=1&timezone=exchange&studies=RSI%40tv-basicstudies%1EMACD%40tv-basicstudies%1EBollingerBands%40tv-basicstudies&withdateranges=1&showpopupbutton=1`}
                style={{ width: '100%', height: '100%' }}
                frameBorder="0"
              ></iframe>
            </div>
          </div>
          </div>
        ) : (
          <BacktestingPanel />
        )}
      </main>
    </div>
  );
}