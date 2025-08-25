from sqlmodel import SQLModel, create_engine, Session, select, Field
from typing import Optional, List
import os, time, random
from contextlib import contextmanager
from datetime import datetime
import json

ENGINE = None

class Trade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(max_length=20)
    side: str = Field(max_length=10)  # "BUY" or "SELL"
    size: float
    price: float
    ts: int = Field(default_factory=lambda: int(time.time()))

class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cash: float = 10000.0

class Candle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(max_length=20)
    openTime: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class Signal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(max_length=20)
    side: str = Field(max_length=10)  # "BUY" or "SELL"
    confidence: float
    entry: float
    sl: float  # stop loss
    tp: float  # take profit
    ts: int = Field(default_factory=lambda: int(time.time()))

class BinanceCredentials(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    api_key: str = Field(max_length=255)
    encrypted_secret: str = Field(max_length=500)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = Field(default=None)

def init_db(database_url: str):
    global ENGINE
    try:
        # Try PostgreSQL first
        ENGINE = create_engine(database_url, echo=False)
        print(f"Database connection established: {database_url}")
    except Exception as e:
        print(f"PostgreSQL connection failed: {e}")
        print("Falling back to SQLite for local development...")
        # Fallback to SQLite
        sqlite_url = "sqlite:///./local_dev.db"
        ENGINE = create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})
        print(f"SQLite database initialized: {sqlite_url}")

def create_db_and_tables():
    try:
        SQLModel.metadata.create_all(ENGINE)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Failed to create tables: {e}")
        # For local development, we can continue without database tables
        print("Continuing without database tables for local development...")

def seed_data_if_needed():
    try:
        with Session(ENGINE) as session:
            # Check if we have any data
            existing_trades = session.exec(select(Trade)).first()
            if not existing_trades:
                # Seed with some sample data
                sample_trades = [
                    Trade(symbol="BTCUSDT", side="BUY", size=0.1, price=30000.0),
                    Trade(symbol="ETHUSDT", side="SELL", size=1.0, price=2000.0),
                ]
                for trade in sample_trades:
                    session.add(trade)
                session.commit()
                print("Sample data seeded successfully")
    except Exception as e:
        print(f"Failed to seed data: {e}")
        print("Continuing without sample data...")

@contextmanager
def get_session():
    session = Session(ENGINE)
    try:
        yield session
    finally:
        session.close()
