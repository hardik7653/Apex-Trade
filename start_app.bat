@echo off
echo Starting ApexTrader Professional Trading Application...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js 16+ and try again
    pause
    exit /b 1
)

echo Installing Python dependencies...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install Python dependencies
    pause
    exit /b 1
)

echo Installing Node.js dependencies...
cd ..\frontend
npm install
if errorlevel 1 (
    echo Error: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo Starting Backend Server...
start "ApexTrader Backend" cmd /k "cd backend && python app.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Application...
start "ApexTrader Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo ApexTrader is starting up!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo.
echo Press any key to open the frontend in your browser...
pause >nul

start http://localhost:3000

echo.
echo Application started successfully!
echo Keep these terminal windows open to run the application.
echo.
pause




