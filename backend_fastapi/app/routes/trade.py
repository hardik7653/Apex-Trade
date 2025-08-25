from fastapi import APIRouter, HTTPException, Body
from sqlmodel import Session, select
from app.db import ENGINE, Trade, Account
from app.binance_service import binance_service
from typing import Dict, Any, Optional
from pydantic import BaseModel
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class TradeRequest(BaseModel):
    action: str  # "placeOrder", "getAccount", "getOpenOrders", "cancelOrder"
    symbol: Optional[str] = None
    side: Optional[str] = None  # "BUY" or "SELL"
    volume: Optional[float] = None
    price: Optional[float] = None
    order_type: Optional[str] = "MARKET"  # "MARKET" or "LIMIT"
    order_id: Optional[int] = None

class TradeResponse(BaseModel):
    ok: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@router.post("/", response_model=TradeResponse)
async def execute_trade_action(trade_request: TradeRequest):
    """Execute various trading actions"""
    try:
        if trade_request.action == "placeOrder":
            return await _place_order(trade_request)
        elif trade_request.action == "getAccount":
            return await _get_account_info()
        elif trade_request.action == "getOpenOrders":
            return await _get_open_orders(trade_request.symbol)
        elif trade_request.action == "cancelOrder":
            return await _cancel_order(trade_request.symbol, trade_request.order_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {trade_request.action}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trade action failed: {e}")
        raise HTTPException(status_code=500, detail=f"Trade action failed: {str(e)}")

async def _place_order(trade_request: TradeRequest) -> TradeResponse:
    """Place an order through Binance"""
    if not trade_request.symbol or not trade_request.side or not trade_request.volume:
        raise HTTPException(status_code=400, detail="Symbol, side, and volume are required")
    
    if trade_request.side.upper() not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Side must be 'BUY' or 'SELL'")
    
    if trade_request.volume <= 0:
        raise HTTPException(status_code=400, detail="Volume must be positive")
    
    if trade_request.order_type == "LIMIT" and not trade_request.price:
        raise HTTPException(status_code=400, detail="Price is required for limit orders")
    
    try:
        # Check if connected to Binance
        if not binance_service.client:
            raise HTTPException(
                status_code=400, 
                detail="Not connected to Binance API. Please connect first."
            )
        
        # Place order through Binance
        order = binance_service.place_order(
            symbol=trade_request.symbol,
            side=trade_request.side,
            order_type=trade_request.order_type,
            quantity=trade_request.volume,
            price=trade_request.price
        )
        
        # Store trade in local database
        with Session(ENGINE) as session:
            trade = Trade(
                symbol=trade_request.symbol.upper(),
                side=trade_request.side.upper(),
                size=trade_request.volume,
                price=order.get('price', 0),
                ts=int(time.time() * 1000)
            )
            session.add(trade)
            session.commit()
        
        return TradeResponse(
            ok=True,
            message=f"Order placed successfully: {trade_request.side} {trade_request.volume} {trade_request.symbol}",
            data=order
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Order placement failed: {e}")
        raise HTTPException(status_code=500, detail=f"Order placement failed: {str(e)}")

async def _get_account_info() -> TradeResponse:
    """Get account information from Binance"""
    try:
        if not binance_service.client:
            raise HTTPException(
                status_code=400, 
                detail="Not connected to Binance API. Please connect first."
            )
        
        account_info = binance_service.get_account_info()
        
        # Format balances for frontend
        positions = {}
        for balance in account_info['balances']:
            if balance['total'] > 0:
                positions[balance['asset']] = balance['total']
        
        formatted_account = {
            'cash': next((b['total'] for b in account_info['balances'] if b['asset'] == 'USDT'), 0),
            'positions': positions,
            'total_trades': 0,  # This would need to be tracked separately
            'account_type': account_info['account_type'],
            'permissions': account_info['permissions']
        }
        
        return TradeResponse(
            ok=True,
            message="Account information retrieved successfully",
            data={'account': formatted_account}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get account info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get account info: {str(e)}")

async def _get_open_orders(symbol: Optional[str]) -> TradeResponse:
    """Get open orders from Binance"""
    try:
        if not binance_service.client:
            raise HTTPException(
                status_code=400, 
                detail="Not connected to Binance API. Please connect first."
            )
        
        orders = binance_service.get_open_orders(symbol=symbol)
        
        return TradeResponse(
            ok=True,
            message="Open orders retrieved successfully",
            data={'orders': orders}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get open orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get open orders: {str(e)}")

async def _cancel_order(symbol: str, order_id: int) -> TradeResponse:
    """Cancel an order on Binance"""
    try:
        if not binance_service.client:
            raise HTTPException(
                status_code=400, 
                detail="Not connected to Binance API. Please connect first."
            )
        
        if not symbol or not order_id:
            raise HTTPException(status_code=400, detail="Symbol and order_id are required")
        
        success = binance_service.cancel_order(symbol=symbol, order_id=order_id)
        
        if success:
            return TradeResponse(
                ok=True,
                message="Order cancelled successfully"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel order")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to cancel order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")

# Legacy endpoints for backward compatibility
@router.get("/")
async def get_trades(
    symbol: str = None,
    limit: int = 100,
    side: str = None
):
    """Get trade history"""
    try:
        with Session(ENGINE) as session:
            query = select(Trade)
            
            if symbol:
                query = query.where(Trade.symbol == symbol.upper())
            
            if side and side.upper() in ["BUY", "SELL"]:
                query = query.where(Trade.side == side.upper())
            
            query = query.order_by(Trade.ts.desc()).limit(limit)
            trades = session.exec(query).all()
            
            return {
                "ok": True,
                "trades": [
                    {
                        "id": trade.id,
                        "symbol": trade.symbol,
                        "side": trade.side,
                        "size": trade.size,
                        "price": trade.price,
                        "timestamp": trade.ts,
                        "value": trade.size * trade.price
                    }
                    for trade in trades
                ],
                "count": len(trades)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")

@router.get("/account")
async def get_account():
    """Get account information (legacy endpoint)"""
    try:
        with Session(ENGINE) as session:
            account = session.exec(select(Account).first())
            
            if not account:
                # Create default account
                account = Account(cash=10000.0)
                session.add(account)
                session.commit()
                session.refresh(account)
            
            # Calculate portfolio value from trades
            trades = session.exec(select(Trade).all()).all()
            portfolio_value = account.cash
            
            # Simple portfolio calculation (in real app, this would be more complex)
            positions = {}
            for trade in trades:
                if trade.symbol not in positions:
                    positions[trade.symbol] = {"size": 0, "avg_price": 0}
                
                if trade.side == "BUY":
                    current_size = positions[trade.symbol]["size"]
                    current_avg = positions[trade.symbol]["avg_price"]
                    new_size = current_size + trade.size
                    new_avg = ((current_size * current_avg) + (trade.size * trade.price)) / new_size
                    positions[trade.symbol] = {"size": new_size, "avg_price": new_avg}
                else:  # SELL
                    positions[trade.symbol]["size"] -= trade.size
            
            return {
                "ok": True,
                "account": {
                    "cash": account.cash,
                    "portfolio_value": portfolio_value,
                    "total_value": portfolio_value,
                    "positions": positions
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch account: {str(e)}")
