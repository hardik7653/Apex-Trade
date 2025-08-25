#!/usr/bin/env python3
"""
Simple test script to verify the AI Trading Bot application is working
"""

import requests
import time
import json

def test_backend():
    """Test backend API endpoints"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing AI Trading Bot Backend...")
    print("=" * 50)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check: PASSED")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check: FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Health check: FAILED - {e}")
        return False
    
    # Test connection endpoint
    try:
        response = requests.post(f"{base_url}/api/connect", 
                               json={"testnet": True}, 
                               timeout=5)
        if response.status_code == 200:
            print("✅ Connection test: PASSED")
        else:
            print(f"❌ Connection test: FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Connection test: FAILED - {e}")
    
    # Test market data endpoint
    try:
        response = requests.get(f"{base_url}/api/klines/BTCUSDT/1h/100", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "data" in data and len(data["data"]) > 0:
                print("✅ Market data: PASSED")
                print(f"   Retrieved {len(data['data'])} candles for BTCUSDT")
            else:
                print("❌ Market data: FAILED - No data received")
        else:
            print(f"❌ Market data: FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Market data: FAILED - {e}")
    
    print("\n🎉 Backend testing completed!")
    return True

def test_frontend():
    """Test frontend availability"""
    print("\n🌐 Testing Frontend...")
    print("=" * 30)
    
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend: PASSED")
            print("   React app is running on http://localhost:3000")
        else:
            print(f"❌ Frontend: FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Frontend: FAILED - {e}")
        print("   Make sure to run 'npm start' in the frontend directory")

def main():
    """Main test function"""
    print("🚀 AI Trading Bot - Application Test")
    print("=" * 50)
    
    # Wait a moment for servers to start
    print("⏳ Waiting for servers to start...")
    time.sleep(3)
    
    # Test backend
    backend_ok = test_backend()
    
    # Test frontend
    test_frontend()
    
    print("\n" + "=" * 50)
    if backend_ok:
        print("🎯 Application Status: READY")
        print("📱 Frontend: http://localhost:3000")
        print("🔧 Backend: http://localhost:5000")
        print("\n💡 Next steps:")
        print("   1. Open http://localhost:3000 in your browser")
        print("   2. Enter your Binance API keys (use testnet for testing)")
        print("   3. Start the AI trading bot!")
    else:
        print("❌ Application Status: BACKEND ISSUES")
        print("   Check the backend logs for errors")

if __name__ == "__main__":
    main()


