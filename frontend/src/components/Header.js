import React from 'react';
import { LogOut, TrendingUp, BarChart3, Settings, Wallet } from 'lucide-react';
import { TRADING_PAIRS } from '../config';

const Header = ({ isConnected, connectionMode, onDisconnect, selectedSymbol, onSymbolChange }) => {
  const getStatusClass = () => {
    if (!isConnected) return 'status-disconnected';
    return connectionMode === 'live' ? 'status-live' : 'status-testnet';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    return connectionMode === 'live' ? 'Live Trading' : 'Testnet';
  };

  return (
    <header className="bg-binance-dark border-b border-binance-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-binance-yellow rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-binance-darker" />
                </div>
                <h1 className="text-xl font-bold text-white">ApexTrader</h1>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="flex items-center space-x-3">
                <span className={`status-indicator ${getStatusClass()}`}></span>
                <span className="text-sm font-medium text-gray-300">
                  {getStatusText()}
                </span>
                
                {/* Mode Badge */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  connectionMode === 'live' 
                    ? 'bg-success-green/20 text-success-green border border-success-green/30'
                    : 'bg-warning-orange/20 text-warning-orange border border-warning-orange/30'
                }`}>
                  {connectionMode === 'live' ? 'LIVE' : 'TESTNET'}
                </div>
              </div>
            )}
          </div>

          {/* Symbol Selector */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-300">Symbol:</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => onSymbolChange(e.target.value)}
                  className="bg-binance-gray border border-binance-light-gray text-white text-sm rounded-md px-3 py-1 focus:border-binance-yellow focus:outline-none"
                >
                  {TRADING_PAIRS.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Navigation and Actions */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-binance-gray rounded-md transition-colors">
                  <Wallet className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-binance-gray rounded-md transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-binance-gray rounded-md transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={onDisconnect}
                  className="flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;




