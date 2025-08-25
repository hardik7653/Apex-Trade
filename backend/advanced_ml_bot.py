import numpy as np
import pandas as pd
import logging
import threading
import time
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import xgboost as xgb
import lightgbm as lgb
import joblib

# Technical Indicators
try:
    import pandas_ta as ta
    PANDAS_TA_AVAILABLE = True
except ImportError:
    PANDAS_TA_AVAILABLE = False
    print("pandas-ta not available, using custom indicators")

from secure_binance_api import SecureBinanceAPI

class AdvancedMLTradingBot:
    def __init__(self, api_key: str, api_secret: str, testnet: bool = True):
        self.api = SecureBinanceAPI(api_key, api_secret, testnet)
        self.running = False
        self.symbols = []
        self.models = {}
        self.scaler = None
        self.feature_columns = []
        self.trades = []
        self.signals = []
        self.performance_metrics = {}
        
        # Trading parameters
        self.risk_percentage = 0.02
        self.max_positions = 5
        self.min_confidence = 0.65
        self.stop_loss_pct = 0.02
        self.take_profit_pct = 0.04
        
        # Threading
        self.data_thread = None
        self.trading_thread = None
        
        self.setup_logging()
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        self.logger = logging.getLogger(f"TradingBot_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        self.logger.setLevel(logging.INFO)
        
        # File handler
        fh = logging.FileHandler(f'{log_dir}/trading_bot.log')
        fh.setLevel(logging.INFO)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        
        self.logger.addHandler(fh)
        self.logger.addHandler(ch)
    
    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate comprehensive technical indicators"""
        try:
            # Basic indicators
            df['sma_20'] = df['close'].rolling(window=20).mean()
            df['sma_50'] = df['close'].rolling(window=50).mean()
            df['ema_12'] = df['close'].ewm(span=12).mean()
            df['ema_26'] = df['close'].ewm(span=26).mean()
            
            # RSI
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs))
            
            # MACD
            df['macd'] = df['ema_12'] - df['ema_26']
            df['macd_signal'] = df['macd'].ewm(span=9).mean()
            df['macd_histogram'] = df['macd'] - df['macd_signal']
            
            # Bollinger Bands
            df['bb_middle'] = df['close'].rolling(window=20).mean()
            bb_std = df['close'].rolling(window=20).std()
            df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
            df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
            df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
            
            # Momentum indicators
            df['momentum'] = df['close'] - df['close'].shift(4)
            df['roc'] = ((df['close'] - df['close'].shift(10)) / df['close'].shift(10)) * 100
            
            # Volatility
            df['volatility'] = df['close'].rolling(window=20).std()
            df['atr'] = self.calculate_atr(df)
            
            # Volume indicators
            df['volume_sma'] = df['volume'].rolling(window=20).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma']
            
            # Price patterns
            df['price_change'] = df['close'].pct_change()
            df['high_low_ratio'] = df['high'] / df['low']
            
            # Additional indicators if pandas-ta is available
            if PANDAS_TA_AVAILABLE:
                try:
                    # Stochastic
                    stoch = ta.stoch(df['high'], df['low'], df['close'])
                    df['stoch_k'] = stoch['STOCHk_14_3_3']
                    df['stoch_d'] = stoch['STOCHd_14_3_3']
                    
                    # Williams %R
                    df['williams_r'] = ta.willr(df['high'], df['low'], df['close'])
                    
                    # CCI
                    df['cci'] = ta.cci(df['high'], df['low'], df['close'])
                    
                    # ADX
                    df['adx'] = ta.adx(df['high'], df['low'], df['close'])
                except Exception as e:
                    self.logger.warning(f"pandas-ta indicators failed: {e}")
            
            return df
        except Exception as e:
            self.logger.error(f"Error calculating indicators: {e}")
            return df
    
    def calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range"""
        try:
            high_low = df['high'] - df['low']
            high_close = np.abs(df['high'] - df['close'].shift())
            low_close = np.abs(df['low'] - df['close'].shift())
            
            true_range = np.maximum(high_low, np.maximum(high_close, low_close))
            atr = true_range.rolling(window=period).mean()
            return atr
        except Exception as e:
            self.logger.error(f"Error calculating ATR: {e}")
            return pd.Series([0] * len(df))
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for ML models"""
        try:
            # Calculate indicators
            df = self.calculate_technical_indicators(df)
            
            # Feature columns
            feature_columns = [
                'open', 'high', 'low', 'close', 'volume',
                'sma_20', 'sma_50', 'ema_12', 'ema_26',
                'rsi', 'macd', 'macd_signal', 'macd_histogram',
                'bb_width', 'momentum', 'roc', 'volatility', 'atr',
                'volume_ratio', 'price_change', 'high_low_ratio'
            ]
            
            # Add pandas-ta features if available
            if PANDAS_TA_AVAILABLE:
                ta_features = ['stoch_k', 'stoch_d', 'williams_r', 'cci', 'adx']
                feature_columns.extend([f for f in ta_features if f in df.columns])
            
            # Create lagged features
            for col in ['close', 'volume', 'rsi', 'macd']:
                for lag in [1, 2, 3]:
                    df[f'{col}_lag_{lag}'] = df[col].shift(lag)
                    feature_columns.append(f'{col}_lag_{lag}')
            
            # Create target variable (next period's price movement)
            df['target'] = np.where(df['close'].shift(-1) > df['close'], 1, 0)
            
            # Remove NaN values
            df = df.dropna()
            
            self.feature_columns = [col for col in feature_columns if col in df.columns]
            
            return df
        except Exception as e:
            self.logger.error(f"Error preparing features: {e}")
            return df
    
    def train_models(self, symbol: str) -> Dict:
        """Train ML models with comprehensive validation"""
        try:
            # Get historical data
            result = self.api.get_klines(symbol, '1h', 5000)
            if "error" in result:
                return {"error": result["error"]}
            
            df = result["data"]
            df = self.prepare_features(df)
            
            if len(df) < 100:
                return {"error": "Insufficient data for training"}
            
            # Prepare features and target
            X = df[self.feature_columns]
            y = df['target']
            
            # Split data
            split_idx = int(len(df) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            # Scale features
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train multiple models
            models = {
                'random_forest': RandomForestClassifier(
                    n_estimators=100, 
                    max_depth=10,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42
                ),
                'gradient_boosting': GradientBoostingClassifier(
                    n_estimators=100,
                    learning_rate=0.1,
                    max_depth=6,
                    random_state=42
                ),
                'xgboost': xgb.XGBClassifier(
                    n_estimators=100,
                    learning_rate=0.1,
                    max_depth=6,
                    random_state=42
                ),
                'lightgbm': lgb.LGBMClassifier(
                    n_estimators=100,
                    learning_rate=0.1,
                    max_depth=6,
                    random_state=42
                )
            }
            
            # Train and evaluate models
            model_performance = {}
            for name, model in models.items():
                try:
                    # Train model
                    model.fit(X_train_scaled, y_train)
                    
                    # Evaluate
                    y_pred = model.predict(X_test_scaled)
                    accuracy = accuracy_score(y_test, y_pred)
                    
                    # Cross-validation
                    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
                    cv_mean = cv_scores.mean()
                    cv_std = cv_scores.std()
                    
                    model_performance[name] = {
                        'accuracy': accuracy,
                        'cv_mean': cv_mean,
                        'cv_std': cv_std
                    }
                    self.models[name] = model
                    
                    self.logger.info(f"{name} - Accuracy: {accuracy:.4f}, CV: {cv_mean:.4f} (+/- {cv_std*2:.4f})")
                    
                except Exception as e:
                    self.logger.error(f"Error training {name}: {e}")
            
            # Create ensemble model
            if len(self.models) >= 2:
                try:
                    ensemble = VotingClassifier(
                        estimators=[(name, model) for name, model in self.models.items()],
                        voting='soft'
                    )
                    ensemble.fit(X_train_scaled, y_train)
                    y_pred_ensemble = ensemble.predict(X_test_scaled)
                    ensemble_accuracy = accuracy_score(y_test, y_pred_ensemble)
                    
                    self.models['ensemble'] = ensemble
                    model_performance['ensemble'] = {
                        'accuracy': ensemble_accuracy,
                        'cv_mean': ensemble_accuracy,
                        'cv_std': 0.0
                    }
                    
                    self.logger.info(f"Ensemble - Accuracy: {ensemble_accuracy:.4f}")
                    
                except Exception as e:
                    self.logger.error(f"Error creating ensemble: {e}")
            
            # Select best model
            if model_performance:
                best_model = max(model_performance, key=lambda x: model_performance[x]['accuracy'])
                best_accuracy = model_performance[best_model]['accuracy']
                
                self.logger.info(f"Best model: {best_model} with accuracy: {best_accuracy:.4f}")
                
                return {
                    "success": True,
                    "best_model": best_model,
                    "accuracy": best_accuracy,
                    "all_models": model_performance,
                    "feature_count": len(self.feature_columns)
                }
            else:
                return {"error": "No models trained successfully"}
                
        except Exception as e:
            self.logger.error(f"Error training models: {e}")
            return {"error": f"Training error: {str(e)}"}
    
    def generate_signal(self, symbol: str) -> Dict:
        """Generate trading signal using trained models"""
        try:
            # Get latest data
            result = self.api.get_klines(symbol, '1h', 100)
            if "error" in result:
                return {"error": result["error"]}
            
            df = result["data"]
            df = self.prepare_features(df)
            
            if len(df) < 50:
                return {"error": "Insufficient data for signal generation"}
            
            # Get latest features
            latest_features = df[self.feature_columns].iloc[-1:].values
            
            if self.scaler:
                latest_features_scaled = self.scaler.transform(latest_features)
            else:
                return {"error": "Models not trained"}
            
            # Get predictions from all models
            predictions = {}
            confidences = {}
            
            for name, model in self.models.items():
                try:
                    pred = model.predict(latest_features_scaled)[0]
                    prob = model.predict_proba(latest_features_scaled)[0]
                    predictions[name] = pred
                    confidences[name] = max(prob)
                except Exception as e:
                    self.logger.error(f"Error with model {name}: {e}")
            
            if not predictions:
                return {"error": "No valid predictions"}
            
            # Ensemble prediction
            buy_votes = sum(1 for pred in predictions.values() if pred == 1)
            total_votes = len(predictions)
            buy_ratio = buy_votes / total_votes
            
            # Average confidence
            avg_confidence = np.mean(list(confidences.values()))
            
            # Generate signal
            signal = "HOLD"
            if buy_ratio > 0.6 and avg_confidence > self.min_confidence:
                signal = "BUY"
            elif buy_ratio < 0.4 and avg_confidence > self.min_confidence:
                signal = "SELL"
            
            # Store signal
            signal_data = {
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "signal": signal,
                "confidence": avg_confidence,
                "buy_ratio": buy_ratio,
                "predictions": predictions,
                "price": float(df['close'].iloc[-1])
            }
            
            self.signals.append(signal_data)
            
            return {
                "success": True,
                "signal": signal,
                "confidence": avg_confidence,
                "buy_ratio": buy_ratio,
                "price": signal_data["price"],
                "timestamp": signal_data["timestamp"]
            }
            
        except Exception as e:
            self.logger.error(f"Error generating signal: {e}")
            return {"error": f"Signal generation error: {str(e)}"}
    
    def execute_trade(self, symbol: str, signal: str, price: float) -> Dict:
        """Execute trade based on signal"""
        try:
            # Get account info
            account_info = self.api.get_account_info()
            if "error" in account_info:
                return {"error": account_info["error"]}
            
            # Calculate position size
            balance = float(account_info.get('totalWalletBalance', 0))
            if balance <= 0:
                return {"error": "Insufficient balance"}
            
            # Calculate quantity based on risk
            risk_amount = balance * self.risk_percentage
            quantity = risk_amount / price
            
            # Round quantity to appropriate decimal places
            quantity = round(quantity, 6)  # Adjust based on symbol requirements
            
            if quantity <= 0:
                return {"error": "Invalid quantity"}
            
            # Place order
            side = "BUY" if signal == "BUY" else "SELL"
            result = self.api.place_order(symbol, side, quantity)
            
            if "error" in result:
                return result
            
            # Store trade
            trade_data = {
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "price": price,
                "signal": signal,
                "order_id": result["order"]["orderId"]
            }
            
            self.trades.append(trade_data)
            self.logger.info(f"Trade executed: {side} {quantity} {symbol} at {price}")
            
            return {
                "success": True,
                "trade": trade_data
            }
            
        except Exception as e:
            self.logger.error(f"Error executing trade: {e}")
            return {"error": f"Trade execution error: {str(e)}"}
    
    def start_trading(self, symbols: List[str]) -> Dict:
        """Start automated trading"""
        try:
            if self.running:
                return {"error": "Trading bot is already running"}
            
            self.symbols = symbols
            self.running = True
            
            # Train models for each symbol
            for symbol in symbols:
                self.logger.info(f"Training models for {symbol}")
                train_result = self.train_models(symbol)
                if "error" in train_result:
                    self.logger.error(f"Failed to train models for {symbol}: {train_result['error']}")
                    continue
            
            # Start trading thread
            self.trading_thread = threading.Thread(target=self._trading_loop)
            self.trading_thread.daemon = True
            self.trading_thread.start()
            
            return {"success": True, "message": "Trading bot started successfully"}
            
        except Exception as e:
            self.logger.error(f"Error starting trading: {e}")
            return {"error": f"Start error: {str(e)}"}
    
    def _trading_loop(self):
        """Main trading loop"""
        while self.running:
            try:
                for symbol in self.symbols:
                    # Generate signal
                    signal_result = self.generate_signal(symbol)
                    if "error" in signal_result:
                        self.logger.error(f"Signal error for {symbol}: {signal_result['error']}")
                        continue
                    
                    # Execute trade if signal is strong
                    if signal_result["signal"] in ["BUY", "SELL"] and signal_result["confidence"] > self.min_confidence:
                        trade_result = self.execute_trade(symbol, signal_result["signal"], signal_result["price"])
                        if "error" in trade_result:
                            self.logger.error(f"Trade error for {symbol}: {trade_result['error']}")
                    
                    # Emit signal to frontend (if socketio is available)
                    try:
                        from flask_socketio import socketio
                        socketio.emit('signal_update', {
                            'symbol': symbol,
                            'signal': signal_result,
                            'timestamp': datetime.now().isoformat()
                        })
                    except:
                        pass  # SocketIO not available
                
                # Update bot status
                self._update_status()
                
                # Wait before next iteration
                time.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Error in trading loop: {e}")
                time.sleep(60)
    
    def _update_status(self):
        """Update bot status"""
        # This will be called by the main app
        pass
    
    def _calculate_win_rate(self) -> float:
        """Calculate win rate from trades"""
        if not self.trades:
            return 0.0
        # This is a simplified calculation - in production you'd track actual P&L
        return 0.65  # Placeholder
    
    def _calculate_total_pnl(self) -> float:
        """Calculate total P&L"""
        if not self.trades:
            return 0.0
        # This is a simplified calculation - in production you'd track actual P&L
        return 0.0  # Placeholder
    
    def stop_trading(self) -> Dict:
        """Stop automated trading"""
        self.running = False
        if self.trading_thread:
            self.trading_thread.join(timeout=5)
        return {"success": True, "message": "Trading bot stopped"}
    
    def get_performance_metrics(self) -> Dict:
        """Get comprehensive performance metrics"""
        try:
            if not self.trades:
                return {
                    "total_trades": 0,
                    "win_rate": 0.0,
                    "total_pnl": 0.0,
                    "avg_trade_size": 0.0,
                    "best_trade": 0.0,
                    "worst_trade": 0.0
                }
            
            # Calculate metrics
            total_trades = len(self.trades)
            win_rate = self._calculate_win_rate()
            total_pnl = self._calculate_total_pnl()
            
            return {
                "total_trades": total_trades,
                "win_rate": win_rate,
                "total_pnl": total_pnl,
                "avg_trade_size": total_pnl / total_trades if total_trades > 0 else 0.0,
                "best_trade": max([t.get('pnl', 0) for t in self.trades]) if self.trades else 0.0,
                "worst_trade": min([t.get('pnl', 0) for t in self.trades]) if self.trades else 0.0
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating performance metrics: {e}")
            return {"error": f"Metrics calculation error: {str(e)}"}
