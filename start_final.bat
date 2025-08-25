@echo off
echo Starting ApexTrader Final Version...
echo.

echo Starting Backend (Flask)...
start "Backend" cmd /k "cd backend && python app.py"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend (React)...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo ApexTrader is starting up!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to open the application...
pause >nul
start http://localhost:3000


