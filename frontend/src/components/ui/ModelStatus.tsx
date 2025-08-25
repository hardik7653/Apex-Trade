'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const ModelStatus = () => {
  const { push } = useToast();
  const { resolvedTheme } = useTheme();
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    loadModelStatus();
    const interval = setInterval(loadModelStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadModelStatus = async () => {
    try {
      const response = await api.get('/model/status');
      if (response.data?.ok) {
        setModelStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load model status:', error);
    }
  };

  const startTraining = async () => {
    if (training) return;
    
    setTraining(true);
    try {
      const response = await api.post('/train', { 
        symbol: 'BTCUSDT', 
        limit: 1000, 
        horizon: 10, 
        threshold: 0.002, 
        n_iter: 8 
      });
      
      if (response.data?.ok) {
        push({ 
          msg: 'Training started successfully!', 
          type: 'success' 
        });
        // Refresh status after a delay
        setTimeout(loadModelStatus, 5000);
      }
    } catch (error: any) {
      push({ 
        msg: error.response?.data?.detail || 'Failed to start training', 
        type: 'error' 
      });
    } finally {
      setTraining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'loaded':
        return 'text-green-600 dark:text-green-400';
      case 'training':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'loaded':
        return <CheckCircle className="w-5 h-5" />;
      case 'training':
        return <Activity className="w-5 h-5 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
      case 'loaded':
        return 'Model Active';
      case 'training':
        return 'Training in Progress';
      case 'error':
        return 'Training Failed';
      default:
        return 'No Model Loaded';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          ML Model Status
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Machine learning model performance and training
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Model Status */}
        <div className="text-center">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            modelStatus?.loaded 
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
          )}>
            {getStatusIcon(modelStatus?.loaded ? 'active' : 'inactive')}
            {getStatusText(modelStatus?.loaded ? 'active' : 'inactive')}
          </div>
        </div>

        {/* Model Details */}
        {modelStatus && (
          <div className="space-y-4">
            {/* Model Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Model Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Symbol:</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {modelStatus.meta?.symbol || 'BTCUSDT'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {modelStatus.meta?.last_updated ? new Date(modelStatus.meta.last_updated).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Training Data:</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {modelStatus.meta?.n_samples || 'N/A'} samples
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Features:</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {modelStatus.meta?.n_features || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {modelStatus.meta?.accuracy && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance Metrics
                </h4>
                <div className="text-center">
                  <div className={cn("text-3xl font-bold mb-2", getAccuracyColor(modelStatus.meta.accuracy))}>
                    {(modelStatus.meta.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Model Accuracy</div>
                </div>
              </div>
            )}

            {/* Training History */}
            {modelStatus.meta?.training_history && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Training History</h4>
                <div className="space-y-2">
                  {modelStatus.meta.training_history.slice(-3).map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                      <span className={cn("font-medium", getAccuracyColor(entry.accuracy))}>
                        {(entry.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Controls */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Model Training</h4>
          
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={startTraining}
              disabled={training}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                training
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25"
              )}
            >
              {training ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Training...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Training
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Training will use the latest market data and optimize model parameters
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">
              <Pause className="w-4 h-4" />
              Pause
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ModelStatus;
