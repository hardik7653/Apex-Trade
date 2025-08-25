import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
import logging
import ta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLTrainer:
    def __init__(self, model_dir: str = "./models"):
        self.model_dir = model_dir
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.model_info = {}
        
        # Ensure model directory exists
        os.makedirs(model_dir, exist_ok=True)
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for training with enhanced technical indicators"""
        try:
            # Ensure we have required columns
            required_cols = ['open', 'high', 'low', 'close', 'volume']
            if not all(col in df.columns for col in required_cols):
                raise ValueError(f"Missing required columns: {required_cols}")
            
            # Calculate technical indicators
            df = df.copy()
            
            # Price-based indicators
            df['sma_5'] = df['close'].rolling(window=5).mean()
            df['sma_10'] = df['close'].rolling(window=10).mean()
            df['sma_20'] = df['close'].rolling(window=20).mean()
            df['ema_5'] = df['close'].ewm(span=5).mean()
            df['ema_10'] = df['close'].ewm(span=10).mean()
            df['ema_20'] = df['close'].ewm(span=20).mean()
            
            # Volatility indicators
            df['atr'] = ta.atr(df['high'], df['low'], df['close'], length=14)
            df['bb_upper'], df['bb_middle'], df['bb_lower'] = ta.bbands(df['close'], length=20)
            df['bb_width'] = df['bb_upper'] - df['bb_lower']
            df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
            
            # Momentum indicators
            df['rsi'] = ta.rsi(df['close'], length=14)
            df['macd'] = ta.macd(df['close'], fast=12, slow=26, signal=9)
            df['macd_signal'] = ta.macd_signal(df['close'], fast=12, slow=26, signal=9)
            df['macd_histogram'] = ta.macd_histogram(df['close'], fast=12, slow=26, signal=9)
            
            # Volume indicators
            df['volume_sma'] = df['volume'].rolling(window=20).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma']
            df['obv'] = ta.obv(df['close'], df['volume'])
            
            # Price changes and returns
            df['price_change'] = df['close'].pct_change()
            df['price_change_5'] = df['close'].pct_change(periods=5)
            df['price_change_10'] = df['close'].pct_change(periods=10)
            
            # High-Low spread
            df['hl_spread'] = (df['high'] - df['low']) / df['close']
            df['hl_spread_5'] = df['hl_spread'].rolling(window=5).mean()
            
            # Volume-price trend
            df['vpt'] = (df['close'] - df['close'].shift(1)) * df['volume']
            df['vpt_sma'] = df['vpt'].rolling(window=20).mean()
            
            # Target variable (next period's direction)
            df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
            
            # Remove rows with NaN values
            df = df.dropna()
            
            # Scale features
            feature_columns = [col for col in df.columns if col not in ['target', 'openTime', 'symbol']]
            self.feature_names = feature_columns
            
            logger.info(f"Prepared {len(feature_columns)} features for training")
            return df

        except Exception as e:
            logger.error(f"Error preparing features: {e}")
            raise
    
    def train_model(self, df: pd.DataFrame, symbol: str, **kwargs) -> Dict[str, Any]:
        """Train the ML model with enhanced parameters"""
        try:
            # Prepare features
            df = self.prepare_features(df)
            
            if len(df) < 100:
                raise ValueError("Insufficient data for training (need at least 100 samples)")
            
            # Prepare X and y
            X = df[self.feature_names]
            y = df['target']
            
            # Split data (80% train, 20% validation)
            split_idx = int(len(df) * 0.8)
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            # Create model pipeline
            models = {
                'hist_gradient_boosting': HistGradientBoostingClassifier(
                    random_state=42,
                    max_iter=1000,
                    learning_rate=0.1,
                    max_depth=10,
                    min_samples_leaf=20
                ),
                'random_forest': RandomForestClassifier(
                    n_estimators=200,
                    max_depth=15,
                    min_samples_split=10,
                    min_samples_leaf=5,
                    random_state=42,
                    n_jobs=-1
                )
            }
            
            best_score = 0
            best_model = None
            best_model_name = None
            
            # Try different models
            for model_name, model in models.items():
                logger.info(f"Training {model_name}...")
                
                # Cross-validation
                cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
                cv_mean = cv_scores.mean()
                cv_std = cv_scores.std()
                
                # Train on full training set
                model.fit(X_train, y_train)
                
                # Validation score
                val_score = model.score(X_val, y_val)
                
                logger.info(f"{model_name} - CV: {cv_mean:.4f} (+/- {cv_std:.4f}), Val: {val_score:.4f}")
                
                if val_score > best_score:
                    best_score = val_score
                    best_model = model
                    best_model_name = model_name
            
            # Use best model
            self.model = best_model
            
            # Final evaluation
            y_pred = self.model.predict(X_val)
            accuracy = accuracy_score(y_val, y_pred)
            
            # Save model
            model_filename = f"{symbol.lower()}_model.joblib"
            model_path = os.path.join(self.model_dir, model_filename)
            
            # Save model and metadata
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'training_date': datetime.now().isoformat(),
                'symbol': symbol,
                'accuracy': accuracy,
                'model_type': best_model_name,
                'n_samples': len(df),
                'n_features': len(self.feature_names)
            }
            
            joblib.dump(model_data, model_path)
            
            # Save model info
            self.model_info = {
                'symbol': symbol,
                'model_type': best_model_name,
                'accuracy': accuracy,
                'training_date': datetime.now().isoformat(),
                'n_samples': len(df),
                'n_features': len(self.feature_names),
                'feature_names': self.feature_names,
                'model_path': model_path
            }
            
            # Save model info to JSON
            info_path = os.path.join(self.model_dir, f"{symbol.lower()}_model_info.json")
            with open(info_path, 'w') as f:
                json.dump(self.model_info, f, indent=2, default=str)
            
            logger.info(f"Model saved successfully. Accuracy: {accuracy:.4f}")
            
            return {
                'ok': True,
                'accuracy': accuracy,
                'model_type': best_model_name,
                'n_samples': len(df),
                'n_features': len(self.feature_names),
                'model_path': model_path
            }
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {
                'ok': False,
                'error': str(e)
            }
    
    def load_model(self, symbol: str) -> bool:
        """Load a trained model"""
        try:
            model_filename = f"{symbol.lower()}_model.joblib"
            model_path = os.path.join(self.model_dir, model_filename)
            
            if not os.path.exists(model_path):
                logger.warning(f"No model found for {symbol}")
                return False
            
            # Load model data
            model_data = joblib.load(model_path)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_names = model_data['feature_names']
            self.model_info = {
                'symbol': symbol,
                'model_type': model_data.get('model_type', 'unknown'),
                'accuracy': model_data.get('accuracy', 0),
                'training_date': model_data.get('training_date', 'unknown'),
                'n_samples': model_data.get('n_samples', 0),
                'n_features': len(self.feature_names) if self.feature_names else 0
            }
            
            logger.info(f"Model loaded successfully for {symbol}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def predict(self, features: pd.DataFrame) -> Optional[float]:
        """Make prediction with loaded model"""
        try:
            if self.model is None:
                logger.error("No model loaded")
                return None
            
            if self.feature_names is None:
                logger.error("No feature names available")
                return None
            
            # Ensure features match expected columns
            missing_features = set(self.feature_names) - set(features.columns)
            if missing_features:
                logger.error(f"Missing features: {missing_features}")
                return None
            
            # Select and order features
            X = features[self.feature_names]
            
            # Make prediction
            prediction = self.model.predict_proba(X)[0]
            confidence = max(prediction)
            
            # Return prediction (1 for up, 0 for down) and confidence
            predicted_class = self.model.predict(X)[0]
            
            return {
                'prediction': int(predicted_class),
                'confidence': float(confidence),
                'probabilities': prediction.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            return None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return self.model_info if self.model_info else {}

# Global trainer instance
trainer = MLTrainer()

def train_model_for_symbol(symbol: str, data: pd.DataFrame, **kwargs) -> Dict[str, Any]:
    """Train model for a specific symbol"""
    return trainer.train_model(data, symbol, **kwargs)

def load_model_for_symbol(symbol: str) -> bool:
    """Load model for a specific symbol"""
    return trainer.load_model(symbol)

def predict_with_model(features: pd.DataFrame) -> Optional[Dict[str, Any]]:
    """Make prediction with loaded model"""
    return trainer.predict(features)

def get_model_status() -> Dict[str, Any]:
    """Get current model status"""
    return trainer.get_model_info()
