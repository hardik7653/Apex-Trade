from fastapi import APIRouter, HTTPException
from app.ml.train import get_model_status, load_model_for_symbol
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_model_status_endpoint():
    """Get current model status"""
    try:
        # Try to load the default model (BTCUSDT)
        model_loaded = load_model_for_symbol("BTCUSDT")
        
        if model_loaded:
            model_info = get_model_status()
            return {
                "ok": True,
                "loaded": True,
                "meta": model_info
            }
        else:
            return {
                "ok": True,
                "loaded": False,
                "meta": None
            }
            
    except Exception as e:
        logger.error(f"Error getting model status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.get("/{symbol}")
async def get_model_status_for_symbol(symbol: str):
    """Get model status for a specific symbol"""
    try:
        symbol = symbol.upper()
        model_loaded = load_model_for_symbol(symbol)
        
        if model_loaded:
            model_info = get_model_status()
            return {
                "ok": True,
                "loaded": True,
                "symbol": symbol,
                "meta": model_info
            }
        else:
            return {
                "ok": True,
                "loaded": False,
                "symbol": symbol,
                "meta": None
            }
            
    except Exception as e:
        logger.error(f"Error getting model status for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.post("/load/{symbol}")
async def load_model_for_symbol_endpoint(symbol: str):
    """Load model for a specific symbol"""
    try:
        symbol = symbol.upper()
        model_loaded = load_model_for_symbol(symbol)
        
        if model_loaded:
            model_info = get_model_status()
            return {
                "ok": True,
                "message": f"Model loaded successfully for {symbol}",
                "loaded": True,
                "meta": model_info
            }
        else:
            return {
                "ok": False,
                "message": f"No trained model found for {symbol}",
                "loaded": False,
                "meta": None
            }
            
    except Exception as e:
        logger.error(f"Error loading model for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")
