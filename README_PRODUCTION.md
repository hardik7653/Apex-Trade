# ApexTrader - AI-Powered Crypto Trading Bot

A complete, production-ready cryptocurrency trading bot with advanced machine learning capabilities, real-time market analysis, and a modern web interface.

## 🚀 Features

### Core Trading Features
- **Binance API Integration** - Support for both Mainnet and Testnet
- **Advanced ML Models** - XGBoost, LightGBM, Random Forest, Ensemble methods
- **Real-time Signal Generation** - AI-powered Buy/Sell/Hold signals
- **Automated Trading** - Execute trades based on AI predictions
- **Risk Management** - Stop-loss, take-profit, position sizing
- **Multi-symbol Trading** - Trade multiple cryptocurrencies simultaneously

### Technical Indicators
- RSI, MACD, Bollinger Bands
- EMA, SMA, Momentum indicators
- Volume analysis, ATR, Volatility
- Custom technical analysis with TA-Lib

### User Interface
- **Modern React Dashboard** - Responsive, professional design
- **Dark/Light Mode** - User preference toggle
- **Real-time Updates** - WebSocket connections for live data
- **Interactive Charts** - Price charts and performance metrics
- **Mobile Responsive** - Works on all devices

### Security & Reliability
- **Secure API Key Management** - Encrypted session storage
- **Comprehensive Error Handling** - No NaN values, proper validation
- **Rate Limiting** - Respects Binance API limits
- **Logging & Monitoring** - Detailed logs for debugging
- **Production Ready** - Scalable architecture

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- Binance API keys (Testnet recommended for testing)
- 4GB+ RAM
- Stable internet connection

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd apextrader_ml_full
```

### 2. Backend Setup

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements_production.txt
```

#### Environment Configuration
Create a `.env` file in the backend directory:
```env
SECRET_KEY=your-secret-key-here
FLASK_ENV=production
LOG_LEVEL=INFO
```

#### Start the Backend Server
```bash
python app_production.py
```

The backend will start on `http://localhost:5000`

### 3. Frontend Setup

#### Install Node.js Dependencies
```bash
cd frontend
npm install
```

#### Environment Configuration
Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000
```

#### Start the Frontend Development Server
```bash
npm start
```

The frontend will start on `http://localhost:3000`

## 🔧 Configuration

### API Keys Setup

1. **Get Binance API Keys**:
   - Go to [Binance Testnet](https://testnet.binance.vision/) for testing
   - Create API keys with trading permissions
   - For production, use [Binance Mainnet](https://www.binance.com/en/my/settings/api-management)

2. **Login to the Application**:
   - Open `http://localhost:3000`
   - Enter your API Key and Secret
   - Choose Testnet or Mainnet
   - Click "Connect to Binance"

### Trading Configuration

1. **Select Trading Symbols**:
   - Choose from available cryptocurrencies (BTCUSDT, ETHUSDT, etc.)
   - Select multiple symbols for diversification

2. **Configure Risk Parameters**:
   - Risk percentage per trade (default: 2%)
   - Maximum concurrent positions (default: 5)
   - Minimum confidence threshold (default: 65%)
   - Stop-loss and take-profit levels

3. **Train ML Models**:
   - Click "Train Models" to train on historical data
   - Wait for training completion
   - Review model accuracy metrics

## 📊 Usage Guide

### Starting the Trading Bot

1. **Login** with your Binance API credentials
2. **Navigate to Trading Bot** section
3. **Select symbols** you want to trade
4. **Train models** for selected symbols
5. **Click "Start Trading"** to begin automated trading

### Monitoring Performance

- **Dashboard**: Overview of bot status, P&L, win rate
- **Trading Bot**: Detailed bot controls and configuration
- **Market Data**: Real-time price charts and market information
- **Performance**: Detailed trading statistics and metrics
- **Settings**: Configure trading parameters and preferences

### Manual Trading

- Use the **Market Data** section to view real-time prices
- Place manual orders through the trading interface
- Monitor your positions and account balance

## 🔒 Security Features

### API Key Security
- Keys are stored in memory only (not persisted)
- Secure session management with cookies
- Automatic logout on session expiry
- No key exposure in logs or UI

### Trading Safety
- Testnet mode for safe testing
- Risk percentage limits per trade
- Maximum position limits
- Stop-loss and take-profit protection

### Error Handling
- Comprehensive validation of all inputs
- Graceful error handling with user-friendly messages
- No NaN values or undefined states
- Detailed logging for debugging

## 📈 Performance Metrics

The bot tracks and displays:
- **Total P&L**: Overall profit/loss
- **Win Rate**: Percentage of profitable trades
- **Total Trades**: Number of executed trades
- **Average Trade Size**: Mean P&L per trade
- **Best/Worst Trades**: Individual trade performance
- **Sharpe Ratio**: Risk-adjusted returns

## 🛡️ Risk Management

### Built-in Protections
- **Position Sizing**: Risk-based position calculation
- **Stop Loss**: Automatic loss protection
- **Take Profit**: Automatic profit taking
- **Maximum Positions**: Limit concurrent trades
- **Confidence Threshold**: Only trade high-confidence signals

### Best Practices
1. **Start with Testnet**: Test thoroughly before live trading
2. **Small Position Sizes**: Begin with 1-2% risk per trade
3. **Monitor Performance**: Regularly review bot performance
4. **Set Stop Losses**: Always use stop-loss protection
5. **Diversify**: Trade multiple symbols

## 🔧 Advanced Configuration

### ML Model Parameters
```python
# In advanced_ml_bot.py
self.risk_percentage = 0.02  # 2% risk per trade
self.max_positions = 5       # Maximum concurrent positions
self.min_confidence = 0.65   # Minimum confidence threshold
self.stop_loss_pct = 0.02    # 2% stop loss
self.take_profit_pct = 0.04  # 4% take profit
```

### Technical Indicators
The bot uses comprehensive technical analysis:
- **Trend Indicators**: SMA, EMA, MACD
- **Momentum Indicators**: RSI, Stochastic, Williams %R
- **Volatility Indicators**: Bollinger Bands, ATR
- **Volume Indicators**: Volume SMA, Volume ratio

### Model Training
- **Data Source**: Binance historical data (5000+ candles)
- **Features**: 20+ technical indicators + lagged features
- **Models**: Random Forest, XGBoost, LightGBM, Ensemble
- **Validation**: Cross-validation with accuracy metrics

## 🚨 Troubleshooting

### Common Issues

1. **API Connection Failed**:
   - Verify API keys are correct
   - Check internet connection
   - Ensure API keys have trading permissions

2. **Model Training Fails**:
   - Check symbol availability on Binance
   - Verify sufficient historical data
   - Review error logs in backend

3. **Trading Bot Won't Start**:
   - Ensure models are trained first
   - Check account balance
   - Verify symbol selection

4. **Performance Issues**:
   - Check system resources
   - Review network connectivity
   - Monitor API rate limits

### Logs and Debugging

Backend logs are stored in:
```
backend/logs/trading_app.log
backend/logs/trading_bot.log
```

Frontend errors are displayed in browser console.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs
3. Test with Testnet first
4. Contact support with detailed error information

## ⚠️ Disclaimer

This software is for educational and research purposes. Cryptocurrency trading involves significant risk. Users are responsible for their trading decisions and should:

- Never invest more than they can afford to lose
- Test thoroughly on Testnet before live trading
- Understand the risks involved in automated trading
- Monitor the bot's performance regularly
- Use proper risk management strategies

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔄 Updates

Stay updated with the latest features and improvements:
- Regular security updates
- New technical indicators
- Improved ML models
- Enhanced UI/UX
- Performance optimizations

---

**Happy Trading! 🚀**



