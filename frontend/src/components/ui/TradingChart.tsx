'use client';
import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, Time } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { cn } from '@/lib/utils';

interface TradingChartProps {
  data: any[];
  symbol: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ data, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const { resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const isDark = resolvedTheme === 'dark';
    
    // Create chart with theme-aware styling
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { 
          type: ColorType.Solid,
          color: isDark ? '#111827' : '#ffffff'
        },
        textColor: isDark ? '#f3f4f6' : '#374151',
      },
      grid: {
        vertLines: { 
          color: isDark ? '#374151' : '#f3f4f6',
          style: 1,
        },
        horzLines: { 
          color: isDark ? '#374151' : '#f3f4f6',
          style: 1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isDark ? '#3b82f6' : '#2563eb',
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? '#1f2937' : '#ffffff',
        },
        horzLine: {
          color: isDark ? '#3b82f6' : '#2563eb',
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? '#1f2937' : '#ffffff',
        },
      },
      rightPriceScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 3,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: false,
        visible: true,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString();
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Create candlestick series with enhanced styling
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      setIsLoading(false);
      
      const chartData: CandlestickData<Time>[] = data.map((candle: any) => ({
        time: Math.floor(candle.openTime / 1000) as Time,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }));

      seriesRef.current.setData(chartData);
      
      // Fit content to view
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {data.length} candles loaded
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div 
        ref={chartContainerRef} 
        className={cn(
          "w-full h-96 rounded-lg border",
          resolvedTheme === 'dark' 
            ? "border-gray-700 bg-gray-900" 
            : "border-gray-200 bg-white"
        )}
      />
    </motion.div>
  );
};

export default TradingChart;
