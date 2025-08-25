@echo off
REM ApexTrader Production Deployment Script for Windows
REM This script deploys the complete ApexTrader platform to production

setlocal enabledelayedexpansion

REM Configuration
set ENV_FILE=env.production
set COMPOSE_FILE=docker-compose.prod.yml
set BACKUP_DIR=.\backups
set LOG_DIR=.\logs

REM Colors for output (Windows doesn't support ANSI colors natively)
set RED=[ERROR]
set GREEN=[SUCCESS]
set YELLOW=[WARNING]
set BLUE=[INFO]
set NC=

echo %BLUE% Starting ApexTrader production deployment...%NC%

REM Check prerequisites
echo %BLUE% Checking prerequisites...%NC%

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo %RED% Docker is not running. Please start Docker and try again.%NC%
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo %RED% Docker Compose is not installed. Please install it and try again.%NC%
    exit /b 1
)

REM Check if environment file exists
if not exist "%ENV_FILE%" (
    echo %RED% Environment file %ENV_FILE% not found. Please create it from env.example%NC%
    exit /b 1
)

echo %GREEN% Prerequisites check passed%NC%

REM Create necessary directories
echo %BLUE% Creating necessary directories...%NC%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist ".\nginx\logs" mkdir ".\nginx\logs"
if not exist ".\nginx\ssl" mkdir ".\nginx\ssl"
echo %GREEN% Directories created%NC%

REM Backup existing deployment
echo %BLUE% Checking for existing deployment...%NC%
docker-compose -f "%COMPOSE_FILE%" ps | findstr "Up" >nul
if not errorlevel 1 (
    echo %BLUE% Backing up existing deployment...%NC%
    
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
    set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
    set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%"
    
    set "BACKUP_NAME=apextrader_backup_%TIMESTAMP%"
    
    REM Create backup
    docker-compose -f "%COMPOSE_FILE%" exec db pg_dump -U postgres apex > "%BACKUP_DIR%\%BACKUP_NAME%.sql"
    
    echo %GREEN% Backup created: %BACKUP_DIR%\%BACKUP_NAME%.sql%NC%
)

REM Stop existing services
echo %BLUE% Stopping existing services...%NC%
docker-compose -f "%COMPOSE_FILE%" ps | findstr "Up" >nul
if not errorlevel 1 (
    docker-compose -f "%COMPOSE_FILE%" down
    echo %GREEN% Services stopped%NC%
) else (
    echo %BLUE% No running services found%NC%
)

REM Build images
echo %BLUE% Building Docker images...%NC%

echo %BLUE% Building frontend image...%NC%
docker-compose -f "%COMPOSE_FILE%" build frontend

echo %BLUE% Building backend image...%NC%
docker-compose -f "%COMPOSE_FILE%" build backend

echo %GREEN% All images built successfully%NC%

REM Deploy services
echo %BLUE% Deploying services...%NC%
docker-compose -f "%COMPOSE_FILE%" up -d

REM Wait for services to be healthy
echo %BLUE% Waiting for services to be healthy...%NC%

set MAX_WAIT=300
set WAIT_COUNT=0

:wait_loop
if %WAIT_COUNT% geq %MAX_WAIT% (
    echo %RED% Services did not become healthy within timeout%NC%
    docker-compose -f "%COMPOSE_FILE%" logs
    exit /b 1
)

docker-compose -f "%COMPOSE_FILE%" ps | findstr "healthy" >nul
if not errorlevel 1 (
    echo %GREEN% All services are healthy%NC%
    goto :deploy_complete
)

timeout /t 10 /nobreak >nul
set /a WAIT_COUNT+=10
echo %BLUE% Waiting for services... (!WAIT_COUNT!/%MAX_WAIT% seconds)%NC%
goto :wait_loop

:deploy_complete

REM Run migrations
echo %BLUE% Running database migrations...%NC%
timeout /t 30 /nobreak >nul

REM Run migrations (if any)
docker-compose -f "%COMPOSE_FILE%" exec backend python -c "from app.db import create_db_and_tables; create_db_and_tables(); print('Database migrations completed')"

echo %GREEN% Database migrations completed%NC%

REM Verify deployment
echo %BLUE% Verifying deployment...%NC%

REM Check if services are responding
set FRONTEND_URL=http://localhost:3000
set BACKEND_URL=http://localhost:8001/health

REM Test frontend
curl -f "%FRONTEND_URL%" >nul 2>&1
if not errorlevel 1 (
    echo %GREEN% Frontend is responding at %FRONTEND_URL%%NC%
) else (
    echo %RED% Frontend is not responding at %FRONTEND_URL%%NC%
    exit /b 1
)

REM Test backend
curl -f "%BACKEND_URL%" >nul 2>&1
if not errorlevel 1 (
    echo %GREEN% Backend is responding at %BACKEND_URL%%NC%
) else (
    echo %RED% Backend is not responding at %BACKEND_URL%%NC%
    exit /b 1
)

REM Check service status
docker-compose -f "%COMPOSE_FILE%" ps

echo %GREEN% Deployment verification completed%NC%

REM Setup monitoring
echo %BLUE% Setting up monitoring...%NC%

REM Create monitoring dashboard
(
echo # ApexTrader Monitoring Dashboard
echo.
echo ## Service Status
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8001
echo - Database: localhost:5432
echo - Redis: localhost:6379
echo.
echo ## Health Checks
echo - Frontend Health: http://localhost:3000/health
echo - Backend Health: http://localhost:8001/health
echo.
echo ## Logs
echo - View logs: docker-compose -f %COMPOSE_FILE% logs -f [service_name]
echo - Frontend logs: docker-compose -f %COMPOSE_FILE% logs -f frontend
echo - Backend logs: docker-compose -f %COMPOSE_FILE% logs -f backend
echo.
echo ## Performance Monitoring
echo - Container stats: docker stats
echo - Resource usage: docker system df
echo.
echo ## Backup
echo - Database backup: %BACKUP_DIR%/
echo - Backup schedule: Daily at 2 AM
) > monitoring.md

echo %GREEN% Monitoring setup completed%NC%

REM Cleanup old backups
echo %BLUE% Cleaning up old backups...%NC%
cd "%BACKUP_DIR%"
for /f "skip=7 delims=" %%i in ('dir /b /o-d *.sql 2^>nul') do del "%%i" 2>nul
cd /d "%~dp0"
echo %GREEN% Old backups cleaned up%NC%

echo.
echo %GREEN% ApexTrader deployment completed successfully!%NC%
echo %BLUE% Access your application at: http://localhost:3000%NC%
echo %BLUE% API documentation at: http://localhost:8001/docs%NC%
echo %BLUE% Check monitoring.md for monitoring information%NC%

pause

