#!/usr/bin/env python3
"""Simple database test to verify functionality"""

import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from db import init_db, create_db_and_tables, seed_data_if_needed, get_session, Candle, Signal, Trade, Account
from sqlmodel import select

def test_database():
    """Test database functionality"""
    print("Testing database functionality...")
    
    # Use test database
    test_db_url = "sqlite:///./test.db"
    
    try:
        # Initialize database
        print("1. Initializing database...")
        init_db(test_db_url)
        
        # Create tables
        print("2. Creating tables...")
        create_db_and_tables()
        
        # Seed data
        print("3. Seeding data...")
        seed_data_if_needed()
        
        # Test queries
        print("4. Testing queries...")
        with get_session() as session:
            # Test candles
            candles = session.exec(select(Candle).limit(5)).all()
            print(f"   - Found {len(candles)} candles")
            
            # Test signals
            signals = session.exec(select(Signal).limit(5)).all()
            print(f"   - Found {len(signals)} signals")
            
            # Test trades
            trades = session.exec(select(Trade).limit(5)).all()
            print(f"   - Found {len(trades)} trades")
            
            # Test accounts
            accounts = session.exec(select(Account).limit(5)).all()
            print(f"   - Found {len(accounts)} accounts")
        
        print("✅ Database test PASSED!")
        return True
        
    except Exception as e:
        print(f"❌ Database test FAILED: {e}")
        return False
    finally:
        # Cleanup
        try:
            if os.path.exists("./test.db"):
                os.remove("./test.db")
                print("   - Cleaned up test database")
        except:
            pass

if __name__ == "__main__":
    success = test_database()
    sys.exit(0 if success else 1)

