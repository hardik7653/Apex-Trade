from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
from app.ml.train import predict_with_model, load_model_for_symbol
from app.db import get_session, Candle, select
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class PredictionRequest(BaseModel):
    symbol: str
    limit: Optional[int] = 100

class PredictionResponse(BaseModel):
    ok: bool
    symbol: str
    prediction: Optional[int] = None
    confidence: Optional[float] = None
    probabilities: Optional[List[float]] = None
    message: Optional[str] = None

def prepare_features_for_prediction(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare features for prediction using the same logic as training"""
    try:
        # Basic price features
        df['price_change'] = df['close'].pct_change()
        df['price_change_abs'] = df['price_change'].abs()
        df['high_low_ratio'] = df['high'] / df['low']
        df['open_close_ratio'] = df['open'] / df['close']
        
        # Moving averages
        for window in [5, 10, 20, 50]:
            df[f'sma_{window}'] = df['close'].rolling(window=window).mean()
            df[f'ema_{window}'] = df['close'].ewm(span=window).mean()
            df[f'sma_ratio_{window}'] = df['close'] / df[f'sma_{window}']
            df[f'ema_ratio_{window}'] = df['close'] / df[f'ema_{window}']
        
        # Volatility features
        df['volatility'] = df['close'].rolling(window=20).std()
        df['volatility_ratio'] = df['volatility'] / df['close']
        
        # Volume features
        df['volume_ma'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_ma']
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = df['close'].ewm(span=12).mean()
        exp2 = df['close'].ewm(span=26).mean()
        df['macd'] = exp1 - exp2
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # ATR (Average True Range)
        high_low = df['high'] - df['low']
        high_close = abs(df['high'] - df['close'].shift())
        low_close = abs(df['low'] - df['close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        df['atr'] = true_range.rolling(window=14).mean()
        
        # Remove rows with NaN values
        df = df.dropna()
        
        return df
        
    except Exception as e:
        logger.error(f"Error preparing features: {e}")
        raise

@router.post("/", response_model=PredictionResponse)
async def get_prediction(request: PredictionRequest):
    """Get prediction for a symbol"""
    try:
        symbol = request.symbol.upper()
        limit = min(request.limit, 200)  # Cap at 200 for prediction performance
        
        logger.info(f"Getting prediction for {symbol}")
        
        # Load model for the symbol
        model_loaded = load_model_for_symbol(symbol)
        
        if not model_loaded:
            return PredictionResponse(
                ok=False,
                symbol=symbol,
                message=f"No trained model available for {symbol}. Please train a model first."
            )
        
        # Load recent candle data
        with get_session() as session:
            stmt = select(Candle).where(Candle.symbol == symbol).order_by(Candle.openTime.desc()).limit(limit)
            candles = session.exec(stmt).all()
            
            if not candles:
                raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
            
            # Convert to DataFrame
            data = []
            for candle in candles:
                data.append({
                    'openTime': candle.openTime,
                    'open': float(candle.open),
                    'high': float(candle.high),
                    'low': float(candle.low),
                    'close': float(candle.close),
                    'volume': float(candle.volume),
                    'symbol': candle.symbol
                })
            
            df = pd.DataFrame(data)
            # Sort by time (oldest first)
            df = df.sort_values('openTime').reset_index(drop=True)
        
        # Prepare features
        df = prepare_features_for_prediction(df)
        
        if len(df) == 0:
            return PredictionResponse(
                ok=False,
                symbol=symbol,
                message="Insufficient data for prediction after feature preparation"
            )
        
        # Get prediction for the most recent data point
        latest_features = df.tail(1)
        prediction_result = predict_with_model(latest_features)
        
        if prediction_result is None:
            return PredictionResponse(
                ok=False,
                symbol=symbol,
                message="Failed to generate prediction"
            )
        
        # Determine prediction message
        prediction_text = "UP" if prediction_result['prediction'] == 1 else "DOWN"
        confidence_text = f"{prediction_result['confidence']:.1%}"
        
        return PredictionResponse(
            ok=True,
            symbol=symbol,
            prediction=prediction_result['prediction'],
            confidence=prediction_result['confidence'],
            probabilities=prediction_result['probabilities'],
            message=f"Prediction: {prediction_text} with {confidence_text} confidence"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get prediction: {str(e)}")

@router.get("/{symbol}")
async def get_prediction_for_symbol(symbol: str, limit: Optional[int] = 100):
    """Get prediction for a symbol via GET request"""
    request = PredictionRequest(symbol=symbol, limit=limit)
    return await get_prediction(request)
