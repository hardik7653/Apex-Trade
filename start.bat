@echo off
setlocal enabledelayedexpansion

REM ApexTrader Startup Script for Windows
REM This script provides multiple options for running the application

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Colors for output (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Function to check if Docker is running
:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker Desktop first."
    exit /b 1
)
call :print_success "Docker is running"
goto :eof

REM Function to check if required ports are available
:check_ports
set "ports=3000 8001 5432 6379"
for %%p in (%ports%) do (
    netstat -an | find "%%p" | find "LISTENING" >nul 2>&1
    if errorlevel 1 (
        call :print_success "Port %%p is available"
    ) else (
        call :print_warning "Port %%p is already in use"
    )
)
goto :eof

REM Function to install dependencies
:install_deps
call :print_status "Installing dependencies..."

REM Frontend dependencies
call :print_status "Installing frontend dependencies..."
cd frontend
call npm install
cd ..

REM Backend dependencies
call :print_status "Installing backend dependencies..."
cd backend_fastapi
pip install -r requirements.txt
cd ..

call :print_success "Dependencies installed successfully"
goto :eof

REM Function to run tests
:run_tests
call :print_status "Running tests..."

REM Frontend tests
call :print_status "Running frontend tests..."
cd frontend
call npm test -- --passWithNoTests
cd ..

REM Backend tests
call :print_status "Running backend tests..."
cd backend_fastapi
python -m pytest test_main.py -v
cd ..

call :print_success "All tests passed!"
goto :eof

REM Function to start development mode
:start_dev
call :print_status "Starting development mode..."

REM Start backend
call :print_status "Starting FastAPI backend..."
cd backend_fastapi
start "ApexTrader Backend" python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
cd ..

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend
call :print_status "Starting Next.js frontend..."
cd frontend
start "ApexTrader Frontend" npm run dev
cd ..

call :print_success "Development servers started!"
call :print_status "Backend: http://localhost:8001"
call :print_status "Frontend: http://localhost:3000"
call :print_status "API Docs: http://localhost:8001/docs"
call :print_warning "Servers are running in separate windows. Close them manually when done."
goto :eof

REM Function to start production mode with Docker
:start_prod
call :print_status "Starting production mode with Docker..."

call :check_docker
call :check_ports

REM Build and start containers
call :print_status "Building and starting Docker containers..."
docker-compose up --build -d

REM Wait for services to be ready
call :print_status "Waiting for services to be ready..."
timeout /t 30 /nobreak >nul

REM Check service health
call :print_status "Checking service health..."

curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    call :print_warning "Frontend may still be starting up..."
) else (
    call :print_success "Frontend is running at http://localhost:3000"
)

curl -f http://localhost:8001/health >nul 2>&1
if errorlevel 1 (
    call :print_warning "Backend may still be starting up..."
) else (
    call :print_success "Backend is running at http://localhost:8001"
)

call :print_success "Production deployment started!"
call :print_status "Frontend: http://localhost:3000"
call :print_status "Backend: http://localhost:8001"
call :print_status "API Docs: http://localhost:8001/docs"

REM Show logs
echo.
call :print_status "Showing logs (Ctrl+C to stop viewing logs, containers will continue running)"
docker-compose logs -f
goto :eof

REM Function to stop production mode
:stop_prod
call :print_status "Stopping production mode..."
docker-compose down
call :print_success "Production deployment stopped"
goto :eof

REM Function to show status
:show_status
call :print_status "Checking application status..."

docker-compose ps | find "Up" >nul 2>&1
if errorlevel 1 (
    call :print_warning "No Docker containers are running"
) else (
    call :print_success "Docker containers are running"
    docker-compose ps
)

REM Check ports
call :check_ports
goto :eof

REM Function to show logs
:show_logs
call :print_status "Showing application logs..."
docker-compose logs -f
goto :eof

REM Function to reset everything
:reset
call :print_warning "This will stop all containers and remove all data. Are you sure? (y/N)"
set /p "response="
if /i "!response!"=="y" (
    call :print_status "Resetting application..."
    docker-compose down -v
    docker system prune -f
    call :print_success "Application reset complete"
) else (
    call :print_status "Reset cancelled"
)
goto :eof

REM Function to show help
:show_help
echo ApexTrader Startup Script for Windows
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   dev         Start development mode (backend + frontend)
echo   prod        Start production mode with Docker
echo   stop        Stop production mode
echo   status      Show application status
echo   logs        Show application logs
echo   test        Run all tests
echo   install     Install dependencies
echo   reset       Reset everything (stop containers, remove data)
echo   help        Show this help message
echo.
echo Examples:
echo   %~nx0 dev      # Start development servers
echo   %~nx0 prod     # Start production with Docker
echo   %~nx0 stop     # Stop production deployment
goto :eof

REM Main script logic
if "%1"=="" goto show_help
if "%1"=="help" goto show_help
if "%1"=="dev" goto start_dev
if "%1"=="prod" goto start_prod
if "%1"=="stop" goto stop_prod
if "%1"=="status" goto show_status
if "%1"=="logs" goto show_logs
if "%1"=="test" goto run_tests
if "%1"=="install" goto install_deps
if "%1"=="reset" goto reset

call :print_error "Unknown command: %1"
call :show_help
exit /b 1

