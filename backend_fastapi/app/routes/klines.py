from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select
from app.db import ENGINE, Candle
from app.binance_service import binance_service
from typing import List, Optional
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_klines(
    symbol: str = Query(..., description="Trading symbol (e.g., BTCUSDT)"),
    limit: int = Query(100, ge=1, le=1000, description="Number of candles to return"),
    interval: str = Query("1m", description="Candle interval (1m, 5m, 15m, 1h, 4h, 1d)")
):
    """Get candlestick data for a symbol"""
    try:
        # Try to get data from Binance first
        if binance_service.client:
            try:
                klines = binance_service.get_klines(symbol, interval, limit)
                return {
                    "ok": True,
                    "symbol": symbol.upper(),
                    "interval": interval,
                    "klines": klines,
                    "count": len(klines),
                    "source": "binance"
                }
            except Exception as e:
                logger.warning(f"Failed to get Binance data for {symbol}: {e}, falling back to local data")
        
        # Fallback to local database
        with Session(ENGINE) as session:
            # Get candles ordered by time (newest first)
            query = select(Candle).where(Candle.symbol == symbol.upper()).order_by(Candle.openTime.desc()).limit(limit)
            candles = session.exec(query).all()
            
            if not candles:
                raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
            
            # Convert to API response format
            klines = []
            for candle in reversed(candles):  # Reverse to get chronological order
                klines.append({
                    "openTime": candle.openTime,
                    "open": float(candle.open),
                    "high": float(candle.high),
                    "low": float(candle.low),
                    "close": float(candle.close),
                    "volume": float(candle.volume),
                    "closeTime": candle.openTime + 60000,  # 1 minute interval
                    "quoteVolume": float(candle.volume) * float(candle.close),
                    "trades": 100,  # Mock data
                    "takerBuyBaseVolume": float(candle.volume) * 0.6,  # Mock data
                    "takerBuyQuoteVolume": float(candle.volume) * float(candle.close) * 0.6
                })
            
            return {
                "ok": True,
                "symbol": symbol.upper(),
                "interval": interval,
                "klines": klines,
                "count": len(klines),
                "source": "local"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get klines for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{symbol}")
async def get_klines_by_symbol(
    symbol: str,
    limit: int = Query(100, ge=1, le=1000),
    interval: str = Query("1m")
):
    """Get candlestick data for a specific symbol"""
    return await get_klines(symbol=symbol, limit=limit, interval=interval)

@router.get("/{symbol}/latest")
async def get_latest_kline(symbol: str):
    """Get the latest candlestick for a symbol"""
    try:
        # Try to get data from Binance first
        if binance_service.client:
            try:
                ticker = binance_service.get_ticker_price(symbol)
                # Create a mock kline from ticker data
                current_time = int(time.time() * 1000)
                kline = {
                    "openTime": current_time,
                    "open": ticker['price'],
                    "high": ticker['price'],
                    "low": ticker['price'],
                    "close": ticker['price'],
                    "volume": 0,  # Not available from ticker
                    "closeTime": current_time + 60000,
                    "quoteVolume": 0
                }
                
                return {
                    "ok": True,
                    "symbol": symbol.upper(),
                    "kline": kline,
                    "source": "binance"
                }
            except Exception as e:
                logger.warning(f"Failed to get Binance ticker for {symbol}: {e}, falling back to local data")
        
        # Fallback to local database
        with Session(ENGINE) as session:
            query = select(Candle).where(Candle.symbol == symbol.upper()).order_by(Candle.openTime.desc()).limit(1)
            candle = session.exec(query).first()
            
            if not candle:
                raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
            
            return {
                "ok": True,
                "symbol": symbol.upper(),
                "kline": {
                    "openTime": candle.openTime,
                    "open": float(candle.open),
                    "high": float(candle.high),
                    "low": float(candle.low),
                    "close": float(candle.close),
                    "volume": float(candle.volume),
                    "closeTime": candle.openTime + 60000,
                    "quoteVolume": float(candle.volume) * float(candle.close)
                },
                "source": "local"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get latest kline for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{symbol}/orderbook")
async def get_order_book(symbol: str, limit: int = Query(10, ge=1, le=100)):
    """Get order book for a symbol"""
    try:
        if not binance_service.client:
            raise HTTPException(
                status_code=400, 
                detail="Not connected to Binance API. Please connect first."
            )
        
        order_book = binance_service.get_order_book(symbol, limit)
        return {
            "ok": True,
            "symbol": symbol.upper(),
            "orderbook": order_book
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get order book for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get order book: {str(e)}")
