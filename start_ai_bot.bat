@echo off
echo Starting ApexTrader AI Trading Bot...
echo.

echo Installing Python dependencies...
cd backend
pip install -r requirements_basic.txt

echo.
echo Starting AI Trading Bot Backend...
start "AI Trading Bot Backend" cmd /k "cd backend && python app_production.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend...
start "AI Trading Bot Frontend" cmd /k "cd frontend && npm start"

echo.
echo ApexTrader AI Trading Bot is starting up!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Features:
echo - AI-Powered Trading Signals
echo - Real-time Market Data
echo - Telegram & Email Notifications
echo - Advanced Technical Indicators
echo - Machine Learning Models
echo.
echo Press any key to open the application...
pause >nul
start http://localhost:3000

