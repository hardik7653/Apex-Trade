from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import pandas as pd
from app.db import get_session, Candle, select
from app.ml.train import train_model_for_symbol, load_model_for_symbol, get_model_status
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class TrainingRequest(BaseModel):
    symbol: str = "BTCUSDT"
    limit: int = 1000
    horizon: Optional[int] = 10
    threshold: Optional[float] = 0.002
    n_iter: Optional[int] = 8

class TrainingResponse(BaseModel):
    ok: bool
    message: str
    job_id: Optional[str] = None
    accuracy: Optional[float] = None
    model_type: Optional[str] = None
    n_samples: Optional[int] = None
    n_features: Optional[int] = None

def load_candles_from_db(symbol: str, limit: int) -> pd.DataFrame:
    """Load candle data from database"""
    try:
        with get_session() as session:
            stmt = select(Candle).where(Candle.symbol == symbol.upper()).order_by(Candle.openTime.desc()).limit(limit)
            candles = session.exec(stmt).all()
            
            if not candles:
                raise ValueError(f"No data found for symbol {symbol}")
            
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
            # Sort by time (oldest first for training)
            df = df.sort_values('openTime').reset_index(drop=True)
            
            logger.info(f"Loaded {len(df)} candles for {symbol}")
            return df
            
    except Exception as e:
        logger.error(f"Error loading candles: {e}")
        raise

def train_model_background(symbol: str, limit: int, **kwargs):
    """Background task for model training"""
    try:
        logger.info(f"Starting background training for {symbol}")
        
        # Load data
        df = load_candles_from_db(symbol, limit)
        
        # Train model
        result = train_model_for_symbol(df, symbol, **kwargs)
        
        if result['ok']:
            logger.info(f"Training completed successfully for {symbol}. Accuracy: {result['accuracy']:.4f}")
        else:
            logger.error(f"Training failed for {symbol}: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"Background training error for {symbol}: {e}")

@router.post("/", response_model=TrainingResponse)
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start model training for a symbol"""
    try:
        symbol = request.symbol.upper()
        limit = min(request.limit, 5000)  # Cap at 5000 for performance
        
        logger.info(f"Starting training for {symbol} with {limit} samples")
        
        # Check if we have enough data
        with get_session() as session:
            stmt = select(Candle).where(Candle.symbol == symbol)
            count = len(session.exec(stmt).all())
            
            if count < 100:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient data for {symbol}. Need at least 100 candles, got {count}"
                )
        
        # Start background training
        background_tasks.add_task(
            train_model_background,
            symbol=symbol,
            limit=limit,
            horizon=request.horizon,
            threshold=request.threshold,
            n_iter=request.n_iter
        )
        
        return TrainingResponse(
            ok=True,
            message=f"Training started for {symbol}",
            job_id=f"train_{symbol}_{int(pd.Timestamp.now().timestamp())}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting training: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")

@router.get("/status/{symbol}")
async def get_training_status(symbol: str):
    """Get training status for a symbol"""
    try:
        symbol = symbol.upper()
        
        # Try to load model to check if it exists
        model_loaded = load_model_for_symbol(symbol)
        
        if model_loaded:
            model_info = get_model_status()
            return {
                "ok": True,
                "symbol": symbol,
                "model_loaded": True,
                "model_info": model_info
            }
        else:
            return {
                "ok": True,
                "symbol": symbol,
                "model_loaded": False,
                "model_info": None
            }
            
    except Exception as e:
        logger.error(f"Error getting training status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get training status: {str(e)}")

@router.post("/load/{symbol}")
async def load_model(symbol: str):
    """Load a trained model for a symbol"""
    try:
        symbol = symbol.upper()
        
        model_loaded = load_model_for_symbol(symbol)
        
        if model_loaded:
            model_info = get_model_status()
            return {
                "ok": True,
                "message": f"Model loaded successfully for {symbol}",
                "model_info": model_info
            }
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"No trained model found for {symbol}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@router.delete("/{symbol}")
async def delete_model(symbol: str):
    """Delete a trained model for a symbol"""
    try:
        symbol = symbol.upper()
        
        # This would implement model deletion logic
        # For now, just return success
        return {
            "ok": True,
            "message": f"Model deletion requested for {symbol} (not implemented)"
        }
        
    except Exception as e:
        logger.error(f"Error deleting model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")
