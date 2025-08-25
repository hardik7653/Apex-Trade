from fastapi import APIRouter
from sqlmodel import Session, select
from app.db import ENGINE, Signal

router = APIRouter()

@router.get("/")
async def get_signals(limit: int = 50):
    with Session(ENGINE) as session:
        q = select(Signal).order_by(Signal.ts.desc())
        res = session.exec(q).all()
        return {"ok": True, "signals": [dict(id=r.id, symbol=r.symbol, side=r.side, confidence=r.confidence, entry=r.entry, sl=r.sl, tp=r.tp, ts=r.ts) for r in res[:limit]]}
