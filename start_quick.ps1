Write-Host "Starting ApexTrader..." -ForegroundColor Green
Write-Host ""

# Start PostgreSQL database
Write-Host "Starting PostgreSQL database..." -ForegroundColor Yellow
docker run -d --name apex-db -e POSTGRES_DB=apex -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine

Write-Host "Waiting for database to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend_fastapi'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload" -WindowStyle Normal

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "ApexTrader is starting up!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8001" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host ""

Write-Host "Opening frontend in browser..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"





