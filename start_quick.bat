@echo off
echo Starting ApexTrader...
echo.

echo Starting PostgreSQL database...
docker run -d --name apex-db -e POSTGRES_DB=apex -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine

echo Waiting for database to start...
timeout /t 5 /nobreak >nul

echo Starting Backend...
start "ApexTrader Backend" cmd /k "cd backend_fastapi && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "ApexTrader Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ApexTrader is starting up!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8001
echo API Docs: http://localhost:8001/docs
echo.
echo Press any key to open the frontend in your browser...
pause >nul
start http://localhost:3000





