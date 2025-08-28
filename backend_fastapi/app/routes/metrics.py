"""
Additional metrics and analytics endpoints for ApexTrader.

This module provides an API endpoint to calculate comprehensive trading metrics
based on the stored trade history. It computes realised profit and loss (PnL),
average hold durations and summary statistics across all trades or for a given
symbol. These analytics extend the default trade listing and summary views to
offer deeper insight into strategy performance.

The calculations use a FIFO (first‑in, first‑out) matching algorithm to pair
sell trades against prior buys. This approach approximates typical broker
accounting and yields sensible realised PnL figures even when multiple buys
occur prior to a sell. If a sell quantity exceeds the sum of previous buys,
the unmatched portion is ignored.

Endpoint:

    GET /trades/metrics
        Optional query parameters:
            symbol: Filter trades to a specific trading pair (e.g. BTCUSDT).
        Response JSON structure:
            {
                "ok": true,
                "metrics": {
                    "total_realised_pnl": float,
                    "symbols": {
                        "BTCUSDT": {
                            "realised_pnl": float,
                            "buy_volume": float,
                            "sell_volume": float,
                            "average_hold_seconds": float,
                            "trades_count": int
                        },
                        ...
                    }
                }
            }

Example:
    >>> GET /trades/metrics?symbol=ETHUSDT
    {
        "ok": true,
        "metrics": {
            "total_realised_pnl": 23.5,
            "symbols": {
                "ETHUSDT": {
                    "realised_pnl": 23.5,
                    "buy_volume": 5.0,
                    "sell_volume": 5.0,
                    "average_hold_seconds": 3600.0,
                    "trades_count": 4
                }
            }
        }
    }

Note:
    The metrics endpoint does not modify database state. It merely reads
    historical trade records, performs in-memory computations and returns
    aggregated statistics. Future enhancements might include support for
    unrealised PnL (open positions), risk metrics such as drawdown or
    Sharpe ratio, or persisting computed analytics into dedicated tables.
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from app.db import ENGINE, Trade


router = APIRouter()


def _calculate_realised_pnl_and_hold_times(trades: List[Trade]) -> Tuple[Dict[str, float], List[int]]:
    """Calculate realised PnL and hold times for a list of trades.

    Trades are processed in chronological order. When a sell trade is
    encountered, it is matched against prior buy trades (FIFO) for the same
    symbol. The function returns a mapping of symbol to realised profit and
    a list of hold time durations (in seconds) for matched trades.

    Args:
        trades: List of Trade objects sorted by timestamp ascending.

    Returns:
        A tuple (realised_pnl, hold_times). realised_pnl maps each symbol
        to the cumulative realised PnL. hold_times contains durations of
        each matched trade pair.
    """
    positions: Dict[str, List[Dict[str, float]]] = {}
    realised_pnl: Dict[str, float] = {}
    hold_times: List[int] = []

    for trade in trades:
        symbol = trade.symbol.upper()
        realised_pnl.setdefault(symbol, 0.0)
        positions.setdefault(symbol, [])

        if trade.side.upper() == "BUY":
            # Store buy details for future matching
            positions[symbol].append({
                "size": float(trade.size),
                "price": float(trade.price),
                "ts": int(trade.ts)
            })
        elif trade.side.upper() == "SELL":
            qty_to_sell = float(trade.size)
            sell_price = float(trade.price)
            sell_ts = int(trade.ts)

            # Match against existing buys in FIFO order
            while qty_to_sell > 0 and positions[symbol]:
                buy = positions[symbol][0]
                matched_size = min(qty_to_sell, buy["size"])

                pnl = (sell_price - buy["price"]) * matched_size
                realised_pnl[symbol] += pnl

                # record hold time if sizes match
                hold_times.append(sell_ts - buy["ts"])

                # update buy record
                buy["size"] -= matched_size
                qty_to_sell -= matched_size
                if buy["size"] <= 0:
                    positions[symbol].pop(0)
            # Unmatched sells are ignored (short selling is unsupported)
        # ignore other side values

    return realised_pnl, hold_times


@router.get("/metrics")
async def get_trade_metrics(symbol: Optional[str] = Query(None, description="Filter by trading pair")):
    """Compute advanced trading metrics across all trades or a specific symbol.

    This endpoint returns realised PnL, buy/sell volumes, average hold time
    and trade count for each symbol. If a symbol query parameter is
    provided, only trades for that symbol will be considered.

    Args:
        symbol: Optional trading pair to filter by (e.g. BTCUSDT).

    Returns:
        JSON response with aggregated metrics.
    """
    try:
        with Session(ENGINE) as session:
            query = select(Trade)
            if symbol:
                query = query.where(Trade.symbol == symbol.upper())
            all_trades = session.exec(query.order_by(Trade.ts)).all()

            if not all_trades:
                return {"ok": True, "metrics": {"total_realised_pnl": 0.0, "symbols": {}}}

            # Compute realised PnL and hold times
            realised_pnl_map, hold_times = _calculate_realised_pnl_and_hold_times(all_trades)

            # Initialise results structure
            result: Dict[str, Dict[str, float]] = {}
            for trade in all_trades:
                sym = trade.symbol.upper()
                result.setdefault(sym, {
                    "realised_pnl": 0.0,
                    "buy_volume": 0.0,
                    "sell_volume": 0.0,
                    "trades_count": 0
                })
                result[sym]["trades_count"] += 1
                if trade.side.upper() == "BUY":
                    result[sym]["buy_volume"] += float(trade.size)
                elif trade.side.upper() == "SELL":
                    result[sym]["sell_volume"] += float(trade.size)

            # Attach PnL
            for sym, pnl in realised_pnl_map.items():
                result[sym]["realised_pnl"] = pnl

            # Compute average hold time
            average_hold_seconds = (sum(hold_times) / len(hold_times)) / 1000 if hold_times else 0.0
            for sym in result:
                result[sym]["average_hold_seconds"] = average_hold_seconds

            total_realised = sum(realised_pnl_map.values())

            return {
                "ok": True,
                "metrics": {
                    "total_realised_pnl": total_realised,
                    "symbols": result
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute metrics: {str(e)}")
