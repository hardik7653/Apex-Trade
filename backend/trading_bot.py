import numpy as np
import pandas as pd
import requests
import hmac
import hashlib
import time
import logging
import json
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import xgboost as xgb
import lightgbm as lgb
from sklearn.ensemble import VotingClassifier
import joblib
import os

# Technical Indicators
import talib

class AdvancedTradingBot:
    def __init__(self, api_key: str, api_secret: str, testnet: bool = True):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.base_url = "https://testnet.binance.vision" if testnet else "https://api.binance.com"
        
        # Trading Configuration
        self.risk_percentage = 0.02  # 2% risk per trade
        self.max_positions = 5
        self.min_confidence = 0.65
        
        # ML Models
        self.models = {}
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = []
        
        # Data Storage
        self.market_data = {}
        self.signals = {}
        self.trades = []
        self.performance_metrics = {}
        
        # Threading
        self.running = False
        self.data_thread = None
        self.trading_thread = None
        
        # Logging
        self.setup_logging()
        
        # Initialize models
        self.initialize_models()
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{log_dir}/trading_bot.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def _generate_signature(self, params: Dict) -> str:
        """Generate HMAC SHA256 signature for signed requests"""
        if not self.api_secret:
            return ""
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return hmac.new(self.api_secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, signed: bool = False) -> Dict:
        """Make HTTP request to Binance API"""
        url = f"{self.base_url}{endpoint}"
        headers = {'X-MBX-APIKEY': self.api_key} if self.api_key else {}
        
        if signed and self.api_secret:
            params['timestamp'] = int(time.time() * 1000)
            params['signature'] = self._generate_signature(params)
        
        try:
            if method == 'GET':
                response = requests.get(url, params=params, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, params=params, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, params=params, headers=headers, timeout=10)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request failed: {e}")
            return {"error": str(e)}
    
    def test_connection(self) -> bool:
        """Test API connection"""
        try:
            result = self._make_request('GET', '/api/v3/ping')
            return "error" not in result
        except Exception as e:
            self.logger.error(f"Connection test failed: {e}")
            return False
    
    def get_klines(self, symbol: str, interval: str = '1h', limit: int = 5000) -> pd.DataFrame:
        """Get historical kline data with enhanced features"""
        try:
            params = {
                'symbol': symbol,
                'interval': interval,
                'limit': limit
            }
            
            response = self._make_request('GET', '/api/v3/klines', params)
            
            if 'error' in response:
                self.logger.error(f"Failed to fetch klines for {symbol}: {response['error']}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'close_time', 
                      'quote_volume', 'trades', 'taker_buy_base', 'taker_buy_quote']
            
            df = pd.DataFrame(response, columns=columns)
            
            # Convert types
            numeric_columns = ['open', 'high', 'low', 'close', 'volume', 'quote_volume', 'taker_buy_base', 'taker_buy_quote']
            for col in numeric_columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['trades'] = pd.to_numeric(df['trades'], errors='coerce')
            
            # Sort by timestamp
            df = df.sort_values('timestamp').reset_index(drop=True)
            
            # Generate technical indicators
            df = self.generate_features(df)
            
            return df
            
        except Exception as e:
            self.logger.error(f"Error fetching klines for {symbol}: {e}")
            return pd.DataFrame()
    
    def generate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Generate advanced technical indicators and features"""
        try:
            if df.empty or len(df) < 50:
                return df
            
            # Price-based features
            df['returns'] = df['close'].pct_change()
            df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
            
            # Volatility features
            df['volatility'] = df['returns'].rolling(window=20).std()
            df['high_low_ratio'] = df['high'] / df['low']
            df['price_range'] = (df['high'] - df['low']) / df['close']
            
            # Moving averages
            for period in [5, 10, 20, 50, 100, 200]:
                df[f'sma_{period}'] = df['close'].rolling(window=period).mean()
                df[f'ema_{period}'] = df['close'].ewm(span=period).mean()
                df[f'price_sma_{period}_ratio'] = df['close'] / df[f'sma_{period}']
            
            # RSI
            df['rsi'] = talib.RSI(df['close'].values, timeperiod=14)
            
            # MACD
            macd, macd_signal, macd_hist = talib.MACD(df['close'].values)
            df['macd'] = macd
            df['macd_signal'] = macd_signal
            df['macd_histogram'] = macd_hist
            
            # Bollinger Bands
            bb_upper, bb_middle, bb_lower = talib.BBANDS(df['close'].values)
            df['bb_upper'] = bb_upper
            df['bb_middle'] = bb_middle
            df['bb_lower'] = bb_lower
            df['bb_width'] = (bb_upper - bb_lower) / bb_middle
            df['bb_position'] = (df['close'] - bb_lower) / (bb_upper - bb_lower)
            
            # ATR (Average True Range)
            df['atr'] = talib.ATR(df['high'].values, df['low'].values, df['close'].values)
            
            # Stochastic
            stoch_k, stoch_d = talib.STOCH(df['high'].values, df['low'].values, df['close'].values)
            df['stoch_k'] = stoch_k
            df['stoch_d'] = stoch_d
            
            # Williams %R
            df['williams_r'] = talib.WILLR(df['high'].values, df['low'].values, df['close'].values)
            
            # Momentum indicators
            df['momentum'] = talib.MOM(df['close'].values, timeperiod=10)
            df['roc'] = talib.ROC(df['close'].values, timeperiod=10)
            
            # Volume features
            df['volume_sma'] = df['volume'].rolling(window=20).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma']
            df['obv'] = talib.OBV(df['close'].values, df['volume'].values)
            
            # Rolling statistics
            for period in [5, 10, 20]:
                df[f'rolling_mean_{period}'] = df['close'].rolling(window=period).mean()
                df[f'rolling_std_{period}'] = df['close'].rolling(window=period).std()
                df[f'rolling_skew_{period}'] = df['close'].rolling(window=period).skew()
                df[f'rolling_kurt_{period}'] = df['close'].rolling(window=period).kurt()
            
            # Price patterns
            df['doji'] = talib.CDLDOJI(df['open'].values, df['high'].values, df['low'].values, df['close'].values)
            df['hammer'] = talib.CDLHAMMER(df['open'].values, df['high'].values, df['low'].values, df['close'].values)
            df['engulfing'] = talib.CDLENGULFING(df['open'].values, df['high'].values, df['low'].values, df['close'].values)
            
            # Support and resistance levels
            df['support'] = df['low'].rolling(window=20).min()
            df['resistance'] = df['high'].rolling(window=20).max()
            df['support_distance'] = (df['close'] - df['support']) / df['close']
            df['resistance_distance'] = (df['resistance'] - df['close']) / df['close']
            
            # Market regime features
            df['trend_strength'] = abs(df['sma_20'] - df['sma_50']) / df['sma_50']
            df['volatility_regime'] = df['volatility'].rolling(window=50).mean()
            
            # Clean up NaN values
            df = df.fillna(method='ffill').fillna(method='bfill')
            
            return df
            
        except Exception as e:
            self.logger.error(f"Error generating features: {e}")
            return df
    
    def prepare_training_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare data for ML training"""
        try:
            if df.empty or len(df) < 100:
                return pd.DataFrame(), pd.Series()
            
            # Define feature columns (exclude non-numeric and target columns)
            exclude_columns = ['timestamp', 'close_time', 'target', 'signal']
            feature_columns = [col for col in df.columns if col not in exclude_columns and df[col].dtype in ['float64', 'int64']]
            
            # Create target variable (next period's price movement)
            df['future_return'] = df['close'].shift(-1) / df['close'] - 1
            df['target'] = pd.cut(df['future_return'], bins=[-np.inf, -0.01, 0.01, np.inf], labels=['SELL', 'HOLD', 'BUY'])
            
            # Remove rows with NaN values
            df_clean = df.dropna()
            
            if df_clean.empty:
                return pd.DataFrame(), pd.Series()
            
            # Prepare features and target
            X = df_clean[feature_columns]
            y = df_clean['target']
            
            # Store feature columns for later use
            self.feature_columns = feature_columns
            
            return X, y
            
        except Exception as e:
            self.logger.error(f"Error preparing training data: {e}")
            return pd.DataFrame(), pd.Series()
    
    def initialize_models(self):
        """Initialize and train ML models"""
        try:
            self.logger.info("Initializing ML models...")
            
            # Initialize base models
            self.models = {
                'xgb': xgb.XGBClassifier(
                    n_estimators=200,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    eval_metric='logloss'
                ),
                'lgb': lgb.LGBMClassifier(
                    n_estimators=200,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    verbose=-1
                ),
                'rf': RandomForestClassifier(
                    n_estimators=200,
                    max_depth=10,
                    random_state=42,
                    n_jobs=-1
                ),
                'gb': GradientBoostingClassifier(
                    n_estimators=200,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42
                )
            }
            
            # Create ensemble model
            estimators = [(name, model) for name, model in self.models.items()]
            self.models['ensemble'] = VotingClassifier(estimators=estimators, voting='soft')
            
            self.logger.info("ML models initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Error initializing models: {e}")
    
    def train_models(self, symbol: str, interval: str = '1h') -> bool:
        """Train ML models on historical data"""
        try:
            self.logger.info(f"Training models for {symbol}...")
            
            # Get historical data
            df = self.get_klines(symbol, interval, limit=5000)
            if df.empty:
                self.logger.error(f"No data available for {symbol}")
                return False
            
            # Prepare training data
            X, y = self.prepare_training_data(df)
            if X.empty or y.empty:
                self.logger.error(f"Insufficient data for training {symbol}")
                return False
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Encode labels
            y_train_encoded = self.label_encoder.fit_transform(y_train)
            y_test_encoded = self.label_encoder.transform(y_test)
            
            # Train individual models
            for name, model in self.models.items():
                if name != 'ensemble':
                    try:
                        self.logger.info(f"Training {name} model...")
                        model.fit(X_train_scaled, y_train_encoded)
                        
                        # Evaluate model
                        y_pred = model.predict(X_test_scaled)
                        accuracy = accuracy_score(y_test_encoded, y_pred)
                        self.logger.info(f"{name} model accuracy: {accuracy:.4f}")
                        
                    except Exception as e:
                        self.logger.error(f"Error training {name} model: {e}")
            
            # Train ensemble model
            try:
                self.logger.info("Training ensemble model...")
                self.models['ensemble'].fit(X_train_scaled, y_train_encoded)
                
                # Evaluate ensemble
                y_pred_ensemble = self.models['ensemble'].predict(X_test_scaled)
                accuracy_ensemble = accuracy_score(y_test_encoded, y_pred_ensemble)
                self.logger.info(f"Ensemble model accuracy: {accuracy_ensemble:.4f}")
                
            except Exception as e:
                self.logger.error(f"Error training ensemble model: {e}")
            
            # Save models
            self.save_models(symbol)
            
            self.logger.info(f"Models trained successfully for {symbol}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error training models: {e}")
            return False
    
    def save_models(self, symbol: str):
        """Save trained models to disk"""
        try:
            models_dir = f"models/{symbol}"
            if not os.path.exists(models_dir):
                os.makedirs(models_dir)
            
            # Save models
            for name, model in self.models.items():
                model_path = f"{models_dir}/{name}_model.pkl"
                joblib.dump(model, model_path)
            
            # Save scaler and encoder
            joblib.dump(self.scaler, f"{models_dir}/scaler.pkl")
            joblib.dump(self.label_encoder, f"{models_dir}/label_encoder.pkl")
            
            # Save feature columns
            with open(f"{models_dir}/feature_columns.json", 'w') as f:
                json.dump(self.feature_columns, f)
            
            self.logger.info(f"Models saved for {symbol}")
            
        except Exception as e:
            self.logger.error(f"Error saving models: {e}")
    
    def load_models(self, symbol: str) -> bool:
        """Load trained models from disk"""
        try:
            models_dir = f"models/{symbol}"
            if not os.path.exists(models_dir):
                self.logger.warning(f"No saved models found for {symbol}")
                return False
            
            # Load models
            for name in self.models.keys():
                model_path = f"{models_dir}/{name}_model.pkl"
                if os.path.exists(model_path):
                    self.models[name] = joblib.load(model_path)
            
            # Load scaler and encoder
            scaler_path = f"{models_dir}/scaler.pkl"
            encoder_path = f"{models_dir}/label_encoder.pkl"
            
            if os.path.exists(scaler_path) and os.path.exists(encoder_path):
                self.scaler = joblib.load(scaler_path)
                self.label_encoder = joblib.load(encoder_path)
            
            # Load feature columns
            feature_path = f"{models_dir}/feature_columns.json"
            if os.path.exists(feature_path):
                with open(feature_path, 'r') as f:
                    self.feature_columns = json.load(f)
            
            self.logger.info(f"Models loaded for {symbol}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading models: {e}")
            return False
    
    def generate_signal(self, symbol: str, interval: str = '1h') -> Dict:
        """Generate trading signal using trained models"""
        try:
            # Get latest market data
            df = self.get_klines(symbol, interval, limit=100)
            if df.empty or len(df) < 50:
                return {"signal": "HOLD", "confidence": 0.0, "reason": "Insufficient data"}
            
            # Prepare features
            latest_data = df.iloc[-1:]
            if not self.feature_columns:
                return {"signal": "HOLD", "confidence": 0.0, "reason": "Models not trained"}
            
            # Select features
            X = latest_data[self.feature_columns]
            if X.empty:
                return {"signal": "HOLD", "confidence": 0.0, "reason": "Feature generation failed"}
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Get predictions from all models
            predictions = {}
            confidences = {}
            
            for name, model in self.models.items():
                try:
                    if hasattr(model, 'predict_proba'):
                        proba = model.predict_proba(X_scaled)[0]
                        pred = model.predict(X_scaled)[0]
                        
                        # Decode prediction
                        if hasattr(self.label_encoder, 'inverse_transform'):
                            pred_decoded = self.label_encoder.inverse_transform([pred])[0]
                        else:
                            pred_decoded = pred
                        
                        predictions[name] = pred_decoded
                        confidences[name] = max(proba)
                        
                except Exception as e:
                    self.logger.error(f"Error getting prediction from {name}: {e}")
                    continue
            
            if not predictions:
                return {"signal": "HOLD", "confidence": 0.0, "reason": "All models failed"}
            
            # Ensemble decision
            signal_counts = {}
            for signal in predictions.values():
                signal_counts[signal] = signal_counts.get(signal, 0) + 1
            
            # Get most common signal
            final_signal = max(signal_counts, key=signal_counts.get)
            
            # Calculate confidence as average of model confidences
            avg_confidence = np.mean(list(confidences.values()))
            
            # Apply confidence threshold
            if avg_confidence < self.min_confidence:
                final_signal = "HOLD"
                reason = f"Low confidence ({avg_confidence:.3f})"
            else:
                reason = f"High confidence ({avg_confidence:.3f})"
            
            # Store signal
            self.signals[symbol] = {
                'signal': final_signal,
                'confidence': avg_confidence,
                'timestamp': datetime.now(),
                'price': df.iloc[-1]['close'],
                'reason': reason
            }
            
            return {
                'signal': final_signal,
                'confidence': avg_confidence,
                'reason': reason,
                'model_predictions': predictions,
                'model_confidences': confidences
            }
            
        except Exception as e:
            self.logger.error(f"Error generating signal for {symbol}: {e}")
            return {"signal": "HOLD", "confidence": 0.0, "reason": f"Error: {str(e)}"}
    
    def calculate_position_size(self, symbol: str, signal: str, confidence: float) -> float:
        """Calculate position size based on risk management"""
        try:
            if signal == "HOLD":
                return 0.0
            
            # Get account balance
            account_info = self._make_request('GET', '/api/v3/account', {}, signed=True)
            if 'error' in account_info:
                return 0.0
            
            # Find USDT balance
            usdt_balance = 0.0
            for balance in account_info.get('balances', []):
                if balance['asset'] == 'USDT':
                    usdt_balance = float(balance['free'])
                    break
            
            if usdt_balance <= 0:
                return 0.0
            
            # Calculate risk amount
            risk_amount = usdt_balance * self.risk_percentage
            
            # Adjust position size based on confidence
            confidence_multiplier = min(confidence / 0.8, 1.5)  # Cap at 1.5x
            
            # Get current price
            current_price = self.signals.get(symbol, {}).get('price', 0)
            if current_price <= 0:
                return 0.0
            
            # Calculate position size
            position_size = (risk_amount * confidence_multiplier) / current_price
            
            # Round to appropriate decimal places
            if symbol.endswith('USDT'):
                position_size = round(position_size, 6)
            else:
                position_size = round(position_size, 4)
            
            return position_size
            
        except Exception as e:
            self.logger.error(f"Error calculating position size: {e}")
            return 0.0
    
    def place_trade(self, symbol: str, signal: str, quantity: float) -> Dict:
        """Place trade on Binance"""
        try:
            if signal == "HOLD" or quantity <= 0:
                return {"success": False, "message": "No trade to place"}
            
            # Determine order side
            side = "BUY" if signal == "BUY" else "SELL"
            
            # Get current price for market order
            current_price = self.signals.get(symbol, {}).get('price', 0)
            if current_price <= 0:
                return {"success": False, "message": "Invalid price"}
            
            # Place market order
            params = {
                'symbol': symbol,
                'side': side,
                'type': 'MARKET',
                'quantity': quantity
            }
            
            result = self._make_request('POST', '/api/v3/order', params, signed=True)
            
            if 'error' in result:
                return {"success": False, "message": result['error']}
            
            # Log trade
            trade_info = {
                'symbol': symbol,
                'side': side,
                'quantity': quantity,
                'price': current_price,
                'timestamp': datetime.now(),
                'order_id': result.get('orderId'),
                'status': result.get('status')
            }
            
            self.trades.append(trade_info)
            self.logger.info(f"Trade placed: {trade_info}")
            
            return {"success": True, "trade": trade_info}
            
        except Exception as e:
            self.logger.error(f"Error placing trade: {e}")
            return {"success": False, "message": str(e)}
    
    def start_trading_loop(self, symbols: List[str], interval: str = '1h'):
        """Start the main trading loop"""
        try:
            self.running = True
            self.logger.info(f"Starting trading loop for symbols: {symbols}")
            
            # Train models for each symbol
            for symbol in symbols:
                self.train_models(symbol, interval)
            
            # Start data collection thread
            self.data_thread = threading.Thread(target=self._data_collection_loop, args=(symbols, interval))
            self.data_thread.daemon = True
            self.data_thread.start()
            
            # Start trading thread
            self.trading_thread = threading.Thread(target=self._trading_loop, args=(symbols, interval))
            self.trading_thread.daemon = True
            self.trading_thread.start()
            
            self.logger.info("Trading loop started successfully")
            
        except Exception as e:
            self.logger.error(f"Error starting trading loop: {e}")
    
    def _data_collection_loop(self, symbols: List[str], interval: str):
        """Continuous data collection loop"""
        while self.running:
            try:
                for symbol in symbols:
                    # Get latest data
                    df = self.get_klines(symbol, interval, limit=100)
                    if not df.empty:
                        self.market_data[symbol] = df
                
                # Wait before next update
                time.sleep(60)  # Update every minute
                
            except Exception as e:
                self.logger.error(f"Error in data collection loop: {e}")
                time.sleep(60)
    
    def _trading_loop(self, symbols: List[str], interval: str):
        """Main trading decision loop"""
        while self.running:
            try:
                for symbol in symbols:
                    # Generate signal
                    signal_data = self.generate_signal(symbol, interval)
                    
                    if signal_data['signal'] != "HOLD":
                        # Calculate position size
                        quantity = self.calculate_position_size(symbol, signal_data['signal'], signal_data['confidence'])
                        
                        if quantity > 0:
                            # Place trade
                            trade_result = self.place_trade(symbol, signal_data['signal'], quantity)
                            
                            if trade_result['success']:
                                self.logger.info(f"Trade executed: {trade_result['trade']}")
                            else:
                                self.logger.warning(f"Trade failed: {trade_result['message']}")
                
                # Wait before next trading cycle
                time.sleep(300)  # 5 minutes between trading cycles
                
            except Exception as e:
                self.logger.error(f"Error in trading loop: {e}")
                time.sleep(300)
    
    def stop_trading(self):
        """Stop the trading loop"""
        self.running = False
        self.logger.info("Trading loop stopped")
    
    def get_performance_metrics(self) -> Dict:
        """Calculate and return performance metrics"""
        try:
            if not self.trades:
                return {"message": "No trades executed yet"}
            
            # Calculate metrics
            total_trades = len(self.trades)
            winning_trades = len([t for t in self.trades if t.get('pnl', 0) > 0])
            losing_trades = len([t for t in self.trades if t.get('pnl', 0) < 0])
            
            win_rate = winning_trades / total_trades if total_trades > 0 else 0
            
            # Calculate total P&L
            total_pnl = sum([t.get('pnl', 0) for t in self.trades])
            
            # Calculate drawdown
            cumulative_pnl = []
            running_total = 0
            for trade in self.trades:
                running_total += trade.get('pnl', 0)
                cumulative_pnl.append(running_total)
            
            if cumulative_pnl:
                peak = max(cumulative_pnl)
                current = cumulative_pnl[-1]
                drawdown = (peak - current) / peak if peak > 0 else 0
            else:
                drawdown = 0
            
            self.performance_metrics = {
                'total_trades': total_trades,
                'winning_trades': winning_trades,
                'losing_trades': losing_trades,
                'win_rate': win_rate,
                'total_pnl': total_pnl,
                'drawdown': drawdown,
                'last_updated': datetime.now()
            }
            
            return self.performance_metrics
            
        except Exception as e:
            self.logger.error(f"Error calculating performance metrics: {e}")
            return {"error": str(e)}
    
    def get_current_status(self) -> Dict:
        """Get current bot status"""
        return {
            'running': self.running,
            'symbols': list(self.market_data.keys()),
            'signals': self.signals,
            'recent_trades': self.trades[-10:] if self.trades else [],
            'performance': self.performance_metrics,
            'last_update': datetime.now()
        }
