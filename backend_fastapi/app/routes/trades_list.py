from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select
from app.db import ENGINE, Trade
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/")
async def get_trades_list(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    side: Optional[str] = Query(None, description="Filter by side (BUY/SELL)"),
    limit: int = Query(50, ge=1, le=500, description="Number of trades to return"),
    offset: int = Query(0, ge=0, description="Number of trades to skip"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get list of trades with filtering options"""
    try:
        with Session(ENGINE) as session:
            query = select(Trade)
            
            # Apply filters
            if symbol:
                query = query.where(Trade.symbol == symbol.upper())
            
            if side and side.upper() in ["BUY", "SELL"]:
                query = query.where(Trade.side == side.upper())
            
            # Date filtering
            if start_date:
                try:
                    start_timestamp = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000)
                    query = query.where(Trade.ts >= start_timestamp)
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
            
            if end_date:
                try:
                    end_timestamp = int((datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)).timestamp() * 1000)
                    query = query.where(Trade.ts < end_timestamp)
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
            
            # Get total count for pagination
            total_query = select(Trade)
            if symbol:
                total_query = total_query.where(Trade.symbol == symbol.upper())
            if side and side.upper() in ["BUY", "SELL"]:
                total_query = total_query.where(Trade.side == side.upper())
            if start_date:
                total_query = total_query.where(Trade.ts >= start_timestamp)
            if end_date:
                total_query = total_query.where(Trade.ts < end_timestamp)
            
            total_count = len(session.exec(total_query).all())
            
            # Apply ordering and pagination
            query = query.order_by(Trade.ts.desc()).offset(offset).limit(limit)
            trades = session.exec(query).all()
            
            # Convert to response format
            trades_list = []
            for trade in trades:
                trade_date = datetime.fromtimestamp(trade.ts / 1000)
                trades_list.append({
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "size": trade.size,
                    "price": trade.price,
                    "value": trade.size * trade.price,
                    "timestamp": trade.ts,
                    "date": trade_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "time_ago": get_time_ago(trade.ts)
                })
            
            return {
                "ok": True,
                "trades": trades_list,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": offset + limit < total_count
                },
                "filters": {
                    "symbol": symbol,
                    "side": side,
                    "start_date": start_date,
                    "end_date": end_date
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")

@router.get("/summary")
async def get_trades_summary(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    period: str = Query("30d", description="Period: 1d, 7d, 30d, 90d, 1y, all")
):
    """Get trading summary statistics"""
    try:
        with Session(ENGINE) as session:
            query = select(Trade)
            
            if symbol:
                query = query.where(Trade.symbol == symbol.upper())
            
            # Apply time period filter
            if period != "all":
                now = datetime.now()
                if period == "1d":
                    start_time = now - timedelta(days=1)
                elif period == "7d":
                    start_time = now - timedelta(days=7)
                elif period == "30d":
                    start_time = now - timedelta(days=30)
                elif period == "90d":
                    start_time = now - timedelta(days=90)
                elif period == "1y":
                    start_time = now - timedelta(days=365)
                else:
                    raise HTTPException(status_code=400, detail="Invalid period. Use: 1d, 7d, 30d, 90d, 1y, all")
                
                start_timestamp = int(start_time.timestamp() * 1000)
                query = query.where(Trade.ts >= start_timestamp)
            
            trades = session.exec(query).all()
            
            if not trades:
                return {
                    "ok": True,
                    "summary": {
                        "total_trades": 0,
                        "total_volume": 0,
                        "total_value": 0,
                        "buy_trades": 0,
                        "sell_trades": 0,
                        "avg_trade_size": 0,
                        "symbols_traded": []
                    }
                }
            
            # Calculate statistics
            total_trades = len(trades)
            total_volume = sum(trade.size for trade in trades)
            total_value = sum(trade.size * trade.price for trade in trades)
            buy_trades = len([t for t in trades if t.side == "BUY"])
            sell_trades = len([t for t in trades if t.side == "SELL"])
            avg_trade_size = total_volume / total_trades if total_trades > 0 else 0
            symbols_traded = list(set(trade.symbol for trade in trades))
            
            return {
                "ok": True,
                "summary": {
                    "total_trades": total_trades,
                    "total_volume": total_volume,
                    "total_value": total_value,
                    "buy_trades": buy_trades,
                    "sell_trades": sell_trades,
                    "avg_trade_size": avg_trade_size,
                    "symbols_traded": symbols_traded,
                    "period": period
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades summary: {str(e)}")

def get_time_ago(timestamp: int) -> str:
    """Convert timestamp to human-readable time ago string"""
    now = datetime.now()
    trade_time = datetime.fromtimestamp(timestamp / 1000)
    diff = now - trade_time
    
    if diff.days > 0:
        return f"{diff.days}d ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours}h ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes}m ago"
    else:
        return "Just now"
