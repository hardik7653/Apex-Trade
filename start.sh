#!/bin/bash

# ApexTrader Startup Script
# This script provides multiple options for running the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if required ports are available
check_ports() {
    local ports=("3000" "8001" "5432" "6379")
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use"
        else
            print_success "Port $port is available"
        fi
    done
}

# Function to install dependencies
install_deps() {
    print_status "Installing dependencies..."
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend_fastapi
    pip install -r requirements.txt
    cd ..
    
    print_success "Dependencies installed successfully"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --passWithNoTests
    cd ..
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend_fastapi
    python -m pytest test_main.py -v
    cd ..
    
    print_success "All tests passed!"
}

# Function to start development mode
start_dev() {
    print_status "Starting development mode..."
    
    # Start backend
    print_status "Starting FastAPI backend..."
    cd backend_fastapi
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Start frontend
    print_status "Starting Next.js frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Development servers started!"
    print_status "Backend: http://localhost:8001"
    print_status "Frontend: http://localhost:3000"
    print_status "API Docs: http://localhost:8001/docs"
    
    # Wait for user to stop
    echo ""
    print_warning "Press Ctrl+C to stop all servers"
    
    # Cleanup function
    cleanup() {
        print_status "Stopping servers..."
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        print_success "Servers stopped"
        exit 0
    }
    
    trap cleanup SIGINT SIGTERM
    
    # Wait for processes
    wait
}

# Function to start production mode with Docker
start_prod() {
    print_status "Starting production mode with Docker..."
    
    check_docker
    check_ports
    
    # Build and start containers
    print_status "Building and starting Docker containers..."
    docker-compose up --build -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    print_status "Checking service health..."
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is running at http://localhost:3000"
    else
        print_warning "Frontend may still be starting up..."
    fi
    
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        print_success "Backend is running at http://localhost:8001"
    else
        print_warning "Backend may still be starting up..."
    fi
    
    print_success "Production deployment started!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:8001"
    print_status "API Docs: http://localhost:8001/docs"
    
    # Show logs
    echo ""
    print_status "Showing logs (Ctrl+C to stop viewing logs, containers will continue running)"
    docker-compose logs -f
}

# Function to stop production mode
stop_prod() {
    print_status "Stopping production mode..."
    docker-compose down
    print_success "Production deployment stopped"
}

# Function to show status
show_status() {
    print_status "Checking application status..."
    
    if docker-compose ps | grep -q "Up"; then
        print_success "Docker containers are running"
        docker-compose ps
    else
        print_warning "No Docker containers are running"
    fi
    
    # Check ports
    check_ports
}

# Function to show logs
show_logs() {
    print_status "Showing application logs..."
    docker-compose logs -f
}

# Function to reset everything
reset() {
    print_warning "This will stop all containers and remove all data. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting application..."
        docker-compose down -v
        docker system prune -f
        print_success "Application reset complete"
    else
        print_status "Reset cancelled"
    fi
}

# Function to show help
show_help() {
    echo "ApexTrader Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development mode (backend + frontend)"
    echo "  prod        Start production mode with Docker"
    echo "  stop        Stop production mode"
    echo "  status      Show application status"
    echo "  logs        Show application logs"
    echo "  test        Run all tests"
    echo "  install     Install dependencies"
    echo "  reset       Reset everything (stop containers, remove data)"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Start development servers"
    echo "  $0 prod     # Start production with Docker"
    echo "  $0 stop     # Stop production deployment"
}

# Main script logic
case "${1:-help}" in
    "dev")
        install_deps
        start_dev
        ;;
    "prod")
        start_prod
        ;;
    "stop")
        stop_prod
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "test")
        install_deps
        run_tests
        ;;
    "install")
        install_deps
        ;;
    "reset")
        reset
        ;;
    "help"|*)
        show_help
        ;;
esac

