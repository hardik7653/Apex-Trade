# 🚀 ApexTrader - Quick Start Guide

## ✅ Project Status: READY TO USE!

Your ApexTrader trading platform is now fully functional and ready for use!

## 🎯 What's Working

- ✅ **Frontend**: Next.js trading interface running on http://localhost:3000
- ✅ **Backend**: FastAPI trading API running on http://localhost:8001  
- ✅ **Database**: PostgreSQL database running on localhost:5432
- ✅ **Real-time Trading**: Live market data and trading capabilities
- ✅ **Binance Integration**: Secure API connection for live trading

## 🚀 Quick Start (Already Running!)

Your services are already running! Just open your browser:

- **🌐 Trading Platform**: http://localhost:3000
- **📚 API Documentation**: http://localhost:8001/docs
- **🔧 Backend API**: http://localhost:8001

## 🛠️ Available Scripts

### Start Everything (Windows)
```bash
start_quick.bat
```

### Start Everything (PowerShell)
```powershell
.\start_quick.ps1
```

### Check Status
```powershell
.\check_status.ps1
```

### Stop Everything
```bash
docker stop apex-db
# Then close the frontend and backend terminal windows
```

## 🔑 Setup Binance API

1. **Get API Keys**: Go to Binance → API Management → Create API
2. **Enable Permissions**: Spot & Margin Trading (ONLY - no withdrawals!)
3. **Connect**: Open http://localhost:3000 → Click "Setup API"
4. **Enter Credentials**: Your API Key and Secret
5. **Start Trading**: You're ready to trade!

## 📊 Features Available

- **Real-time Charts**: Live candlestick charts for BTC, ETH, ADA, DOT
- **Live Trading**: Execute buy/sell orders in real-time
- **Portfolio Tracking**: Monitor balances and positions
- **Order Management**: Place market and limit orders
- **Market Data**: Live price feeds and order book
- **Secure Storage**: Encrypted API credentials

## 🚨 Important Notes

- **Test First**: Use testnet or small amounts initially
- **API Security**: Never share your Binance API secret
- **Trading Risk**: Cryptocurrency trading involves risk
- **ML Features**: Temporarily disabled due to Windows compatibility

## 🔧 Troubleshooting

### If Frontend Won't Load
```bash
cd frontend
npm run dev
```

### If Backend Won't Start
```bash
cd backend_fastapi
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### If Database Issues
```bash
docker restart apex-db
```

## 🌟 Next Steps

1. **Connect Binance API** for live trading
2. **Explore the interface** at http://localhost:3000
3. **Check API docs** at http://localhost:8001/docs
4. **Start with small trades** to test functionality

## 🎉 You're All Set!

Your ApexTrader platform is running and ready for professional trading. Enjoy the advanced features and happy trading!

---

**Need Help?** Check the main README.md for detailed documentation.





