from sqlmodel import Session, select
from app.db import ENGINE, Candle
import pandas as pd

def load_candles_from_db(symbol: str, limit: int = None):
    with Session(ENGINE) as session:
        q = select(Candle).where(Candle.symbol == symbol.upper()).order_by(Candle.openTime)
        rows = session.exec(q).all()
        data = [dict(openTime=r.openTime, open=r.open, high=r.high, low=r.low, close=r.close, volume=r.volume) for r in rows]
        df = pd.DataFrame(data)
        if df.empty:
            return df
        if limit:
            df = df.tail(limit).reset_index(drop=True)
        return df
