#!/bin/bash

# ApexTrader Production Deployment Script
# This script deploys the complete ApexTrader platform to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE="env.production"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install it and try again."
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found. Please create it from env.example"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "./nginx/logs"
    mkdir -p "./nginx/ssl"
    
    log_success "Directories created"
}

backup_existing() {
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_info "Backing up existing deployment..."
        
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_NAME="apextrader_backup_$TIMESTAMP"
        
        # Create backup
        docker-compose -f "$COMPOSE_FILE" exec db pg_dump -U postgres apex > "$BACKUP_DIR/${BACKUP_NAME}.sql"
        
        log_success "Backup created: $BACKUP_DIR/${BACKUP_NAME}.sql"
    fi
}

stop_services() {
    log_info "Stopping existing services..."
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" down
        log_success "Services stopped"
    else
        log_info "No running services found"
    fi
}

build_images() {
    log_info "Building Docker images..."
    
    # Build frontend
    log_info "Building frontend image..."
    docker-compose -f "$COMPOSE_FILE" build frontend
    
    # Build backend
    log_info "Building backend image..."
    docker-compose -f "$COMPOSE_FILE" build backend
    
    log_success "All images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    
    MAX_WAIT=300  # 5 minutes
    WAIT_COUNT=0
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "healthy"; then
            log_success "All services are healthy"
            break
        fi
        
        sleep 10
        WAIT_COUNT=$((WAIT_COUNT + 10))
        log_info "Waiting for services... ($WAIT_COUNT/$MAX_WAIT seconds)"
    done
    
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        log_error "Services did not become healthy within timeout"
        docker-compose -f "$COMPOSE_FILE" logs
        exit 1
    fi
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 30
    
    # Run migrations (if any)
    docker-compose -f "$COMPOSE_FILE" exec backend python -c "
from app.db import create_db_and_tables
create_db_and_tables()
print('Database migrations completed')
"
    
    log_success "Database migrations completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if services are responding
    FRONTEND_URL="http://localhost:3000"
    BACKEND_URL="http://localhost:8001/health"
    
    # Test frontend
    if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
        log_success "Frontend is responding at $FRONTEND_URL"
    else
        log_error "Frontend is not responding at $FRONTEND_URL"
        exit 1
    fi
    
    # Test backend
    if curl -f "$BACKEND_URL" > /dev/null 2>&1; then
        log_success "Backend is responding at $BACKEND_URL"
    else
        log_error "Backend is not responding at $BACKEND_URL"
        exit 1
    fi
    
    # Check service status
    docker-compose -f "$COMPOSE_FILE" ps
    
    log_success "Deployment verification completed"
}

setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring dashboard
    cat > monitoring.md << EOF
# ApexTrader Monitoring Dashboard

## Service Status
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- Database: localhost:5432
- Redis: localhost:6379

## Health Checks
- Frontend Health: http://localhost:3000/health
- Backend Health: http://localhost:8001/health

## Logs
- View logs: docker-compose -f $COMPOSE_FILE logs -f [service_name]
- Frontend logs: docker-compose -f $COMPOSE_FILE logs -f frontend
- Backend logs: docker-compose -f $COMPOSE_FILE logs -f backend

## Performance Monitoring
- Container stats: docker stats
- Resource usage: docker system df

## Backup
- Database backup: $BACKUP_DIR/
- Backup schedule: Daily at 2 AM
EOF
    
    log_success "Monitoring setup completed"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only last 7 backups
    cd "$BACKUP_DIR"
    ls -t *.sql | tail -n +8 | xargs -r rm
    cd - > /dev/null
    
    log_success "Old backups cleaned up"
}

main() {
    log_info "Starting ApexTrader production deployment..."
    
    check_prerequisites
    create_directories
    backup_existing
    stop_services
    build_images
    deploy_services
    run_migrations
    verify_deployment
    setup_monitoring
    cleanup_old_backups
    
    log_success "ApexTrader deployment completed successfully!"
    log_info "Access your application at: http://localhost:3000"
    log_info "API documentation at: http://localhost:8001/docs"
    log_info "Check monitoring.md for monitoring information"
}

# Run main function
main "$@"

