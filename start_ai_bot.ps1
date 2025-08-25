# ApexTrader AI Trading Bot Startup Script (PowerShell)
Write-Host "Starting ApexTrader AI Trading Bot..." -ForegroundColor Green
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>&1
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found! Please install Node.js 16+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Set-Location backend
pip install -r requirements_enhanced.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Python dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting AI Trading Bot Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python app_enhanced.py" -WindowStyle Normal

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Set-Location ..
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "ApexTrader AI Trading Bot is starting up!" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor White
Write-Host "- AI-Powered Trading Signals" -ForegroundColor White
Write-Host "- Real-time Market Data" -ForegroundColor White
Write-Host "- Telegram & Email Notifications" -ForegroundColor White
Write-Host "- Advanced Technical Indicators" -ForegroundColor White
Write-Host "- Machine Learning Models" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open the application..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "http://localhost:3000"

