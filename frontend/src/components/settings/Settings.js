import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    riskPercentage: 2.0,
    maxPositions: 5,
    minConfidence: 65,
    stopLoss: 2.0,
    takeProfit: 4.0,
    autoRestart: false,
    notifications: true
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // Save settings to backend
    console.log('Saving settings:', settings);
    // TODO: Implement settings save
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure your trading bot and application preferences
          </p>
        </div>
      </div>

      {/* Trading Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trading Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Risk Percentage per Trade (%)
            </label>
            <input
              type="number"
              value={settings.riskPercentage}
              onChange={(e) => handleSettingChange('riskPercentage', parseFloat(e.target.value))}
              min="0.1"
              max="10"
              step="0.1"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Percentage of account balance to risk per trade
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Concurrent Positions
            </label>
            <input
              type="number"
              value={settings.maxPositions}
              onChange={(e) => handleSettingChange('maxPositions', parseInt(e.target.value))}
              min="1"
              max="20"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum number of open positions at once
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Confidence Threshold (%)
            </label>
            <input
              type="number"
              value={settings.minConfidence}
              onChange={(e) => handleSettingChange('minConfidence', parseInt(e.target.value))}
              min="50"
              max="95"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum AI confidence required to execute trades
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stop Loss (%)
            </label>
            <input
              type="number"
              value={settings.stopLoss}
              onChange={(e) => handleSettingChange('stopLoss', parseFloat(e.target.value))}
              min="0.5"
              max="10"
              step="0.1"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Automatic stop loss percentage
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Take Profit (%)
            </label>
            <input
              type="number"
              value={settings.takeProfit}
              onChange={(e) => handleSettingChange('takeProfit', parseFloat(e.target.value))}
              min="0.5"
              max="20"
              step="0.1"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Automatic take profit percentage
            </p>
          </div>
        </div>
      </div>

      {/* Application Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Application Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Restart Bot</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Automatically restart bot after crashes</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoRestart}
              onChange={(e) => handleSettingChange('autoRestart', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable trade and signal notifications</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Actions</h3>
        
        <div className="flex space-x-4">
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Version</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">API Status</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Connected</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bot Status</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;



