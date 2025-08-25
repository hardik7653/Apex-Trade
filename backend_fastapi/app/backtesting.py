import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from app.binance_service import binance_service

logger = logging.getLogger(__name__)

class BacktestingEngine:
    def __init__(self):
        self.trades = []
        self.signals = []
        self.performance_metrics = {}
        self.initial_balance = 10000.0  # Default starting balance
        self.current_balance = 0.0
        self.position = None
        self.position_size = 0.0
        self.risk_per_trade = 0.02  # 2% risk per trade
        self.stop_loss_pct = 0.02  # 2% stop loss
        self.take_profit_pct = 0.04  # 4% take profit
        
    def run_backtest(self, symbol: str, interval: str = '1h', 
                    start_date: Optional[str] = None, 
                    end_date: Optional[str] = None,
                    initial_balance: float = 10000.0,
                    risk_per_trade: float = 0.02,
                    stop_loss_pct: float = 0.02,
                    take_profit_pct: float = 0.04) -> Dict[str, Any]:
        """
        Run backtest on historical data
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '1h', '4h', '1d')
            start_date: Start date for backtest (format: 'YYYY-MM-DD')
            end_date: End date for backtest (format: 'YYYY-MM-DD')
            initial_balance: Starting balance for backtest
            risk_per_trade: Percentage of balance to risk per trade
            stop_loss_pct: Stop loss percentage
            take_profit_pct: Take profit percentage
            
        Returns:
            Dict with backtest results
        """
        try:
            # Reset backtest state
            self.trades = []
            self.signals = []
            self.initial_balance = initial_balance
            self.current_balance = initial_balance
            self.position = None
            self.position_size = 0.0
            self.risk_per_trade = risk_per_trade
            self.stop_loss_pct = stop_loss_pct
            self.take_profit_pct = take_profit_pct
            
            # Get historical data
            historical_data = self._get_historical_data(symbol, interval, start_date, end_date)
            if not historical_data or len(historical_data) < 100:
                return {"error": "Insufficient historical data for backtesting"}
            
            # Convert to DataFrame
            df = pd.DataFrame(historical_data)
            
            # Ensure required columns exist
            required_columns = ['openTime', 'open', 'high', 'low', 'close', 'volume']
            if not all(col in df.columns for col in required_columns):
                return {"error": "Historical data missing required columns"}
            
            # Prepare features for signal generation
            df = self._prepare_features(df)
            
            # Generate signals for each candle
            for i in range(100, len(df)):
                # Use data up to current candle for feature calculation
                current_data = df.iloc[:i+1].copy()
                
                # Generate signal
                signal = self._generate_signal(current_data, symbol)
                
                # Store signal
                signal_data = {
                    "timestamp": current_data.iloc[-1]['openTime'],
                    "symbol": symbol,
                    "signal": signal,
                    "price": current_data.iloc[-1]['close'],
                }
                self.signals.append(signal_data)
                
                # Execute trade based on signal
                self._execute_trade(signal_data, current_data)
            
            # Calculate performance metrics
            self._calculate_performance()
            
            return {
                "success": True,
                "initial_balance": self.initial_balance,
                "final_balance": self.current_balance,
                "profit_loss": self.current_balance - self.initial_balance,
                "profit_loss_pct": ((self.current_balance / self.initial_balance) - 1) * 100,
                "trades": self.trades,
                "signals": self.signals,
                "metrics": self.performance_metrics
            }
            
        except Exception as e:
            logger.error(f"Backtest error: {e}")
            return {"error": f"Backtest failed: {str(e)}"}
    
    def _get_historical_data(self, symbol: str, interval: str, 
                           start_date: Optional[str], 
                           end_date: Optional[str]) -> List[Dict]:
        """Get historical data for backtesting"""
        try:
            # Get klines data from Binance
            klines = binance_service.get_klines(symbol, interval, limit=1000)
            
            # Filter by date if provided
            if start_date or end_date:
                filtered_klines = []
                start_timestamp = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000) if start_date else 0
                end_timestamp = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp() * 1000) if end_date else float('inf')
                
                for kline in klines:
                    if start_timestamp <= kline['openTime'] <= end_timestamp:
                        filtered_klines.append(kline)
                
                return filtered_klines
            
            return klines
            
        except Exception as e:
            logger.error(f"Error getting historical data: {e}")
            return []
    
    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for signal generation"""
        try:
            # Calculate technical indicators
            # RSI
            delta = df['close'].diff()
            gain = delta.where(delta > 0, 0)
            loss = -delta.where(delta < 0, 0)
            avg_gain = gain.rolling(window=14).mean()
            avg_loss = loss.rolling(window=14).mean()
            rs = avg_gain / avg_loss
            df['rsi'] = 100 - (100 / (1 + rs))
            
            # Moving Averages
            df['sma_20'] = df['close'].rolling(window=20).mean()
            df['sma_50'] = df['close'].rolling(window=50).mean()
            df['sma_200'] = df['close'].rolling(window=200).mean()
            
            # MACD
            df['ema_12'] = df['close'].ewm(span=12, adjust=False).mean()
            df['ema_26'] = df['close'].ewm(span=26, adjust=False).mean()
            df['macd'] = df['ema_12'] - df['ema_26']
            df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
            df['macd_hist'] = df['macd'] - df['macd_signal']
            
            # Bollinger Bands
            df['bb_middle'] = df['close'].rolling(window=20).mean()
            df['bb_std'] = df['close'].rolling(window=20).std()
            df['bb_upper'] = df['bb_middle'] + 2 * df['bb_std']
            df['bb_lower'] = df['bb_middle'] - 2 * df['bb_std']
            
            # Momentum
            df['momentum'] = df['close'].pct_change(periods=10) * 100
            
            # Volatility
            df['volatility'] = df['close'].rolling(window=20).std() / df['close'].rolling(window=20).mean() * 100
            
            # Fill NaN values
            df = df.fillna(method='bfill')
            
            return df
            
        except Exception as e:
            logger.error(f"Error preparing features: {e}")
            return df
    
    def _generate_signal(self, df: pd.DataFrame, symbol: str) -> str:
        """Generate trading signal based on technical indicators"""
        try:
            # Get latest data point
            latest = df.iloc[-1]
            
            # Initialize signal as HOLD
            signal = "HOLD"
            
            # RSI conditions
            if latest['rsi'] < 30:
                signal = "BUY"
            elif latest['rsi'] > 70:
                signal = "SELL"
            
            # Moving Average conditions
            if latest['sma_20'] > latest['sma_50'] and latest['close'] > latest['sma_20']:
                signal = "BUY"
            elif latest['sma_20'] < latest['sma_50'] and latest['close'] < latest['sma_20']:
                signal = "SELL"
            
            # MACD conditions
            if latest['macd'] > latest['macd_signal'] and latest['macd_hist'] > 0:
                signal = "BUY"
            elif latest['macd'] < latest['macd_signal'] and latest['macd_hist'] < 0:
                signal = "SELL"
            
            # Bollinger Bands conditions
            if latest['close'] < latest['bb_lower']:
                signal = "BUY"
            elif latest['close'] > latest['bb_upper']:
                signal = "SELL"
            
            return signal
            
        except Exception as e:
            logger.error(f"Error generating signal: {e}")
            return "HOLD"
    
    def _execute_trade(self, signal_data: Dict, df: pd.DataFrame) -> None:
        """Execute trade based on signal"""
        try:
            current_price = signal_data['price']
            signal = signal_data['signal']
            timestamp = signal_data['timestamp']
            
            # If no position and signal is BUY
            if self.position is None and signal == "BUY":
                # Calculate position size based on risk
                risk_amount = self.current_balance * self.risk_per_trade
                self.position_size = risk_amount / current_price
                
                # Calculate stop loss and take profit levels
                stop_loss = current_price * (1 - self.stop_loss_pct)
                take_profit = current_price * (1 + self.take_profit_pct)
                
                # Open position
                self.position = {
                    "entry_price": current_price,
                    "size": self.position_size,
                    "stop_loss": stop_loss,
                    "take_profit": take_profit,
                    "entry_time": timestamp
                }
                
                # Record trade
                self.trades.append({
                    "timestamp": timestamp,
                    "symbol": signal_data['symbol'],
                    "side": "BUY",
                    "price": current_price,
                    "quantity": self.position_size,
                    "value": current_price * self.position_size,
                    "balance_before": self.current_balance,
                    "balance_after": self.current_balance,
                    "status": "OPEN"
                })
                
            # If position exists
            elif self.position is not None:
                # Check for stop loss or take profit
                if current_price <= self.position['stop_loss']:
                    # Stop loss hit
                    pnl = (current_price - self.position['entry_price']) * self.position['size']
                    self.current_balance += pnl
                    
                    # Record trade
                    self.trades.append({
                        "timestamp": timestamp,
                        "symbol": signal_data['symbol'],
                        "side": "SELL",
                        "price": current_price,
                        "quantity": self.position['size'],
                        "value": current_price * self.position['size'],
                        "pnl": pnl,
                        "pnl_pct": (current_price / self.position['entry_price'] - 1) * 100,
                        "balance_before": self.current_balance - pnl,
                        "balance_after": self.current_balance,
                        "status": "CLOSED",
                        "reason": "STOP_LOSS"
                    })
                    
                    # Close position
                    self.position = None
                    self.position_size = 0.0
                    
                elif current_price >= self.position['take_profit']:
                    # Take profit hit
                    pnl = (current_price - self.position['entry_price']) * self.position['size']
                    self.current_balance += pnl
                    
                    # Record trade
                    self.trades.append({
                        "timestamp": timestamp,
                        "symbol": signal_data['symbol'],
                        "side": "SELL",
                        "price": current_price,
                        "quantity": self.position['size'],
                        "value": current_price * self.position['size'],
                        "pnl": pnl,
                        "pnl_pct": (current_price / self.position['entry_price'] - 1) * 100,
                        "balance_before": self.current_balance - pnl,
                        "balance_after": self.current_balance,
                        "status": "CLOSED",
                        "reason": "TAKE_PROFIT"
                    })
                    
                    # Close position
                    self.position = None
                    self.position_size = 0.0
                    
                # Check for sell signal
                elif signal == "SELL":
                    # Close position based on signal
                    pnl = (current_price - self.position['entry_price']) * self.position['size']
                    self.current_balance += pnl
                    
                    # Record trade
                    self.trades.append({
                        "timestamp": timestamp,
                        "symbol": signal_data['symbol'],
                        "side": "SELL",
                        "price": current_price,
                        "quantity": self.position['size'],
                        "value": current_price * self.position['size'],
                        "pnl": pnl,
                        "pnl_pct": (current_price / self.position['entry_price'] - 1) * 100,
                        "balance_before": self.current_balance - pnl,
                        "balance_after": self.current_balance,
                        "status": "CLOSED",
                        "reason": "SIGNAL"
                    })
                    
                    # Close position
                    self.position = None
                    self.position_size = 0.0
                    
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
    
    def _calculate_performance(self) -> None:
        """Calculate performance metrics"""
        try:
            # Filter completed trades
            completed_trades = [t for t in self.trades if t.get('status') == 'CLOSED']
            
            if not completed_trades:
                self.performance_metrics = {
                    "total_trades": 0,
                    "winning_trades": 0,
                    "losing_trades": 0,
                    "win_rate": 0,
                    "profit_factor": 0,
                    "average_profit": 0,
                    "average_loss": 0,
                    "max_drawdown": 0,
                    "sharpe_ratio": 0
                }
                return
            
            # Calculate metrics
            total_trades = len(completed_trades)
            winning_trades = len([t for t in completed_trades if t.get('pnl', 0) > 0])
            losing_trades = len([t for t in completed_trades if t.get('pnl', 0) <= 0])
            
            win_rate = winning_trades / total_trades if total_trades > 0 else 0
            
            # Calculate profit metrics
            gross_profit = sum([t.get('pnl', 0) for t in completed_trades if t.get('pnl', 0) > 0])
            gross_loss = sum([abs(t.get('pnl', 0)) for t in completed_trades if t.get('pnl', 0) <= 0])
            
            profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
            
            average_profit = gross_profit / winning_trades if winning_trades > 0 else 0
            average_loss = gross_loss / losing_trades if losing_trades > 0 else 0
            
            # Calculate drawdown
            balance_history = [self.initial_balance]
            for trade in completed_trades:
                balance_history.append(trade.get('balance_after', balance_history[-1]))
            
            max_balance = self.initial_balance
            max_drawdown = 0
            
            for balance in balance_history:
                max_balance = max(max_balance, balance)
                drawdown = (max_balance - balance) / max_balance
                max_drawdown = max(max_drawdown, drawdown)
            
            # Calculate Sharpe ratio (simplified)
            returns = []
            for i in range(1, len(balance_history)):
                returns.append((balance_history[i] / balance_history[i-1]) - 1)
            
            avg_return = np.mean(returns) if returns else 0
            std_return = np.std(returns) if returns else 1
            sharpe_ratio = (avg_return / std_return) * np.sqrt(252) if std_return > 0 else 0
            
            # Store metrics
            self.performance_metrics = {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": losing_trades,
                "win_rate": win_rate,
                "profit_factor": profit_factor,
                "average_profit": average_profit,
                "average_loss": average_loss,
                "max_drawdown": max_drawdown,
                "sharpe_ratio": sharpe_ratio
            }
            
        except Exception as e:
            logger.error(f"Error calculating performance: {e}")
            self.performance_metrics = {}

# Create singleton instance
backtesting_engine = BacktestingEngine()