# ApexTrader - Professional Trading Platform

ApexTrader is a full-stack trading platform that integrates with Binance API to provide real-time market data, advanced charting, and automated trading capabilities. Built with Next.js, FastAPI, and PostgreSQL.

## 🚀 Features

### Core Trading Features
- **Real-time Market Data**: Live price feeds from Binance API
- **Advanced Charting**: Interactive candlestick charts with multiple timeframes
- **Order Management**: Market and limit orders with real-time execution
- **Portfolio Tracking**: Real-time balance and position monitoring
- **Order Book**: Live order book visualization with click-to-trade
- **Multiple Trading Pairs**: Support for BTCUSDT, ETHUSDT, ADAUSDT, DOTUSDT and more
- **Backtesting Engine**: Test trading strategies on historical data with performance metrics

### Security & API Management
- **Secure Credential Storage**: Encrypted API key storage using Fernet encryption
- **Binance Integration**: Direct connection to Binance trading API
- **Permission Management**: Configurable API permissions for trading
- **Connection Monitoring**: Real-time connection status and health checks

### User Experience
- **Responsive Design**: Modern, mobile-friendly interface
- **Dark/Light Theme**: Automatic theme switching with system preference
- **Real-time Updates**: Live data refresh and notifications
- **Toast Notifications**: User-friendly feedback for all actions
- **Loading States**: Smooth loading animations and progress indicators

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Lightweight Charts**: Professional trading charts
- **SWR**: Data fetching and caching

### Backend
- **FastAPI**: High-performance Python web framework
- **PostgreSQL**: Reliable relational database
- **SQLModel**: Modern SQL database toolkit
- **Python-Binance**: Official Binance API client
- **Cryptography**: Secure credential encryption
- **Redis**: Caching and session management

### Infrastructure
- **Docker**: Containerized deployment
- **Docker Compose**: Multi-service orchestration
- **Health Checks**: Service monitoring and auto-restart

## 📊 Backtesting Engine

The platform includes a powerful backtesting engine that allows you to test trading strategies on historical data:

- **Historical Data Analysis**: Test strategies using real market data
- **Performance Metrics**: Win rate, profit factor, Sharpe ratio, and maximum drawdown
- **Risk Management**: Configurable risk per trade, stop-loss, and take-profit levels
- **Visual Results**: Interactive charts showing balance history and trade performance
- **Trade History**: Detailed log of all simulated trades with entry/exit points
- **Multiple Timeframes**: Test on different intervals (1m, 5m, 15m, 1h, 4h, 1d)
- **Customizable Parameters**: Adjust initial balance, risk levels, and date ranges

## 📋 Prerequisites

Before running ApexTrader, ensure you have:

1. **Docker & Docker Compose** installed on your system
2. **Binance Account** with API access enabled
3. **API Permissions**: Enable spot trading permissions in your Binance account

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd apextrader_ml_full
```

### 2. Environment Setup
Copy the environment file and configure your settings:
```bash
cp env.example env.local
```

Edit `env.local` with your configuration:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apex

# API Configuration
API_HOST=0.0.0.0
API_PORT=8001

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8001

# Development Configuration
DEBUG=true
LOG_LEVEL=INFO
```

### 3. Start the Application
```bash
# Using Docker Compose (Recommended)
docker-compose up -d

# Or using the provided scripts
# Windows
start.bat

# Linux/Mac
./start.sh
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Database**: localhost:5432

## 🔑 Binance API Setup

### 1. Create Binance API Keys
1. Log into your Binance account
2. Go to **API Management** → **Create API**
3. Enable **Spot & Margin Trading** permissions
4. **Important**: Only enable trading permissions, avoid withdrawal permissions
5. Copy your **API Key** and **Secret Key**

### 2. Connect in ApexTrader
1. Open the application at http://localhost:3000
2. Click **"Setup API"** in the Binance Setup section
3. Enter your API Key and Secret
4. Click **"Save & Connect"**
5. The system will test the connection and store credentials securely

### 3. Security Notes
- API credentials are encrypted using Fernet encryption
- Only trading permissions are required
- Never share your API secret with anyone
- Credentials are stored locally and encrypted

## 📊 Using the Trading Platform

### Market Data
- **Real-time Charts**: View live candlestick charts for any supported trading pair
- **Price Updates**: Live price feeds with automatic refresh
- **Order Book**: Real-time order book with click-to-trade functionality

### Trading
1. **Select Trading Pair**: Choose from available symbols (BTCUSDT, ETHUSDT, etc.)
2. **Choose Order Type**: Market (instant) or Limit (specified price)
3. **Set Amount**: Enter the quantity you want to trade
4. **Set Price**: For limit orders, specify your desired price
5. **Execute Trade**: Click the trade button to place your order

### Portfolio Management
- **Balance Overview**: View your USDT and crypto balances
- **Position Tracking**: Monitor open positions and P&L
- **Trade History**: Review completed trades and performance

## 🔧 Development

### Project Structure
```
apextrader_ml_full/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities and API client
│   ├── package.json         # Frontend dependencies
│   └── Dockerfile           # Frontend container
├── backend_fastapi/         # FastAPI backend application
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── db.py            # Database models and connection
│   │   ├── binance_service.py # Binance API integration
│   │   └── main.py          # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Backend container
├── docker-compose.yml       # Multi-service orchestration
└── README.md               # This file
```

### Running in Development Mode
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend_fastapi
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Database Management
```bash
# Access PostgreSQL
docker exec -it apextrader_ml_full-db-1 psql -U postgres -d apex

# View tables
\dt

# Check Binance credentials
SELECT * FROM binancecredentials;
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Backend Tests
```bash
cd backend_fastapi
pytest                     # Run all tests
pytest -v                  # Verbose output
pytest --cov=app          # Coverage report
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:8001/health

# Test Binance connection
curl http://localhost:8001/binance/status
```

## 🚀 Deployment

### Production Environment
1. **Update Environment Variables**:
   - Set `DEBUG=false`
   - Configure production database URL
   - Set secure `SECRET_KEY`
   - Configure CORS origins

2. **Build and Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **SSL/HTTPS**: Configure reverse proxy (Nginx) with SSL certificates

### Monitoring
- **Health Checks**: Built-in health endpoints for all services
- **Logs**: Structured logging with configurable levels
- **Metrics**: Performance monitoring and alerting

## 🔒 Security Considerations

### API Security
- Credentials are encrypted using Fernet encryption
- API keys are stored securely in the database
- No sensitive data is logged or exposed

### Network Security
- CORS configuration for controlled access
- Rate limiting on API endpoints
- Input validation and sanitization

### Best Practices
- Use strong, unique API keys
- Regularly rotate API credentials
- Monitor API usage and permissions
- Enable 2FA on your Binance account

## 🐛 Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart
```

#### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

#### API Connection Issues
1. Verify API key permissions in Binance
2. Check network connectivity
3. Verify API key format and validity
4. Check backend logs for detailed error messages

### Debug Mode
Enable debug mode in `env.local`:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

## 📈 Performance Optimization

### Frontend
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js built-in image optimization
- **Caching**: SWR for intelligent data caching

### Backend
- **Async Operations**: Non-blocking API calls
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis for session and data caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation

## 🔮 Roadmap

### Upcoming Features
- **Advanced Order Types**: Stop-loss, take-profit orders
- **Trading Bots**: Automated trading strategies
- **Mobile App**: Native mobile application
- **Social Trading**: Copy trading and leaderboards
- **Advanced Analytics**: Performance metrics and backtesting

### Performance Improvements
- **WebSocket Integration**: Real-time data streaming
- **Microservices**: Service decomposition for scalability
- **Kubernetes**: Container orchestration for production

---

**Disclaimer**: This software is for educational and development purposes. Always test thoroughly before using with real funds. The developers are not responsible for any financial losses incurred through the use of this software.
"# Apex-Trade" 
"# Apex-Trade" 
