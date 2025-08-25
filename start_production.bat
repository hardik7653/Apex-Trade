@echo off
echo ========================================
echo    ApexTrader Production Trading Bot
echo ========================================
echo.

echo Starting backend server...
cd backend
start "Backend Server" cmd /k "python app_production.py"
cd ..

echo.
echo Starting frontend development server...
cd frontend
start "Frontend Server" cmd /k "npm start"
cd ..

echo.
echo ========================================
echo    Application Starting...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Please wait for both servers to start...
echo.
echo Press any key to open the application...
pause >nul

start http://localhost:3000

echo.
echo Application opened in your browser!
echo.
echo To stop the servers, close the command windows.
pause



