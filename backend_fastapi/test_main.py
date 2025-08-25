import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db, create_db_and_tables, seed_data_if_needed
import os

# Test client
client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database"""
    # Use in-memory SQLite for testing
    test_db_url = "sqlite:///./test.db"
    
    # Set environment variable for testing
    os.environ["DATABASE_URL"] = test_db_url
    os.environ["SEED_DB"] = "true"
    
    # Initialize test database
    init_db(test_db_url)
    create_db_and_tables()
    
    # Seed the database with test data
    seed_data_if_needed()
    
    yield
    
    # Cleanup
    try:
        if os.path.exists("./test.db"):
            os.remove("./test.db")
    except PermissionError:
        # File might be locked, ignore cleanup error
        pass

def test_health_check():
    """Test health endpoint"""
    response = client.get("/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert data["service"] == "apextrader-ml-backend"

def test_klines_endpoint():
    """Test klines endpoint"""
    response = client.get("/klines/?symbol=BTCUSDT&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert "klines" in data
    assert "symbol" in data

def test_trade_endpoint():
    """Test trade endpoint"""
    trade_data = {
        "symbol": "BTCUSDT",
        "side": "BUY",
        "size": 0.01,
        "price": 30000.0,
        "order_type": "MARKET"
    }
    response = client.post("/trade/", json=trade_data)
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert data["symbol"] == "BTCUSDT"
    assert data["side"] == "BUY"

def test_trades_list_endpoint():
    """Test trades list endpoint"""
    response = client.get("/trades/")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert "trades" in data
    assert "pagination" in data

def test_model_status_endpoint():
    """Test model status endpoint"""
    response = client.get("/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data

def test_predict_endpoint():
    """Test prediction endpoint"""
    response = client.post("/predict/", json={"symbol": "BTCUSDT"})
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data

def test_signals_endpoint():
    """Test signals endpoint"""
    response = client.get("/signals/")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert "signals" in data

def test_invalid_symbol():
    """Test invalid symbol handling"""
    response = client.get("/klines/?symbol=INVALID&limit=10")
    assert response.status_code == 404

def test_invalid_trade_data():
    """Test invalid trade data handling"""
    invalid_trade = {
        "symbol": "BTCUSDT",
        "side": "INVALID",
        "size": -0.01,
        "price": 0
    }
    response = client.post("/trade/", json=invalid_trade)
    assert response.status_code == 400

def test_pagination():
    """Test pagination in trades list"""
    response = client.get("/trades/?limit=5&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["limit"] == 5
    assert data["pagination"]["offset"] == 0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
