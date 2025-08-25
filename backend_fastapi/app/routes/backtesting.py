from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.backtesting import backtesting_engine

router = APIRouter(
    prefix="/backtesting",
    tags=["backtesting"],
    responses={404: {"description": "Not found"}},
)

class BacktestRequest(BaseModel):
    symbol: str
    interval: str = "1h"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_balance: float = 10000.0
    risk_per_trade: float = 0.02
    stop_loss_pct: float = 0.02
    take_profit_pct: float = 0.04

@router.post("/run")
async def run_backtest(request: BacktestRequest):
    """
    Run a backtest simulation on historical data
    """
    try:
        # Set default dates if not provided
        if not request.start_date:
            # Default to 30 days ago
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        else:
            start_date = request.start_date
            
        if not request.end_date:
            # Default to today
            end_date = datetime.now().strftime("%Y-%m-%d")
        else:
            end_date = request.end_date
        
        # Run backtest
        result = backtesting_engine.run_backtest(
            symbol=request.symbol,
            interval=request.interval,
            start_date=start_date,
            end_date=end_date,
            initial_balance=request.initial_balance,
            risk_per_trade=request.risk_per_trade,
            stop_loss_pct=request.stop_loss_pct,
            take_profit_pct=request.take_profit_pct
        )
        
        if "error" in result:
            return {"success": False, "error": result["error"]}
            
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/symbols")
async def get_available_symbols():
    """
    Get list of available symbols for backtesting
    """
    try:
        # Common crypto trading pairs
        symbols = [
            "BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "DOGEUSDT",
            "XRPUSDT", "DOTUSDT", "LTCUSDT", "LINKUSDT", "BCHUSDT",
            "MATICUSDT", "SOLUSDT", "AVAXUSDT", "UNIUSDT", "SHIBUSDT"
        ]
        
        return {"success": True, "symbols": symbols}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/intervals")
async def get_available_intervals():
    """
    Get list of available timeframe intervals for backtesting
    """
    try:
        intervals = [
            "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"
        ]
        
        return {"success": True, "intervals": intervals}
        
    except Exception as e:
        return {"success": False, "error": str(e)}