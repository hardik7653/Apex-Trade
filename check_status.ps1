Write-Host "=== ApexTrader Status Check ===" -ForegroundColor Green
Write-Host ""

# Check Docker containers
Write-Host "Docker Containers:" -ForegroundColor Yellow
docker ps --filter "name=apex-db" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""

# Check ports
Write-Host "Port Status:" -ForegroundColor Yellow
$ports = @(3000, 8001, 5432)

foreach ($port in $ports) {
    $listening = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
    if ($listening) {
        Write-Host "Port $port`: RUNNING" -ForegroundColor Green
    } else {
        Write-Host "Port $port`: NOT RUNNING" -ForegroundColor Red
    }
}

Write-Host ""

# Check services
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8001" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "Database: localhost:5432" -ForegroundColor Cyan

Write-Host ""

# Test backend health
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get -TimeoutSec 5
    Write-Host "Backend Health: OK" -ForegroundColor Green
} catch {
    Write-Host "Backend Health: ERROR" -ForegroundColor Red
}

Write-Host ""
Write-Host "Status check complete!" -ForegroundColor Green





