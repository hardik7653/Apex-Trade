import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, klines, trade, signals, trades_list, binance, backtesting
# from app.routes import predict, train, model_status  # Temporarily disabled due to ML import issues
from app.db import init_db, create_db_and_tables, seed_data_if_needed
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/apex")

app = FastAPI(title="ApexTrader Advanced Backend")

origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    init_db(DATABASE_URL)
    create_db_and_tables()
    if os.getenv("SEED_DB", "true").lower() in ("1","true","yes"):
        seed_data_if_needed()

# include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(klines.router, prefix="/klines", tags=["klines"])
# app.include_router(predict.router, prefix="/predict", tags=["predict"])  # Temporarily disabled
# app.include_router(train.router, prefix="/train", tags=["train"])  # Temporarily disabled
# app.include_router(model_status.router, prefix="/model", tags=["model"])  # Temporarily disabled
app.include_router(signals.router, prefix="/signals", tags=["signals"])
app.include_router(trade.router, prefix="/trade", tags=["trade"])
app.include_router(trades_list.router, prefix="/trades", tags=["trades"])
app.include_router(binance.router, prefix="/binance", tags=["binance"])
app.include_router(backtesting.router, prefix="/backtesting", tags=["backtesting"])
