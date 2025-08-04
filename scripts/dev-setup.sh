#!/bin/bash

# Echoes of Me - Development Setup Script
# Optimized for local development with cloud-ready architecture

set -e

echo "🚀 Setting up Echoes of Me for local development..."

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Check Docker daemon
check_docker() {
    print_status "Checking Docker daemon..."
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    print_success "Docker daemon is running"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env.local ]; then
        if [ -f .env.local.template ]; then
            cp .env.local.template .env.local
            print_success "Created .env.local from template"
            print_warning "Please review and customize .env.local for your setup"
        else
            print_error ".env.local.template not found"
            exit 1
        fi
    else
        print_warning ".env.local already exists - skipping"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=(
        "public/voices"
        "public/voices/synthesis"
        "data/training"
        "models"
        "logs"
        "config/nginx"
        "config/prometheus"
        "config/grafana"
        "scripts/db-init"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
    done
    
    print_success "Created necessary directories"
}

# Setup Docker networks and volumes
setup_docker_resources() {
    print_status "Setting up Docker resources..."
    
    # Create custom network if it doesn't exist
    if ! docker network ls | grep -q echosofme_network; then
        docker network create echosofme_network --driver bridge --subnet=172.20.0.0/16
        print_success "Created Docker network: echosofme_network"
    else
        print_warning "Docker network echosofme_network already exists"
    fi
    
    # Create volumes
    volumes=(
        "echosofme_postgres_data"
        "echosofme_redis_data"
        "echosofme_voice_data"
    )
    
    for volume in "${volumes[@]}"; do
        if ! docker volume ls | grep -q "$volume"; then
            docker volume create "$volume"
            print_success "Created Docker volume: $volume"
        else
            print_warning "Docker volume $volume already exists"
        fi
    done
}

# Install Node.js dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f package-lock.json ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Node.js dependencies installed"
}

# Setup database initialization scripts
setup_database_init() {
    print_status "Setting up database initialization..."
    
    cat > scripts/db-init/01-init.sql << 'EOF'
-- Echoes of Me Database Initialization
-- Performance optimizations for local development

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Performance monitoring view
CREATE OR REPLACE VIEW db_performance AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE echosofme_dev TO echosofme;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO echosofme;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO echosofme;

-- Optimize for development
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
EOF
    
    print_success "Database initialization scripts created"
}

# Start services in development mode
start_services() {
    print_status "Starting development services..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.dev.yml down &> /dev/null || true
    
    # Start in development mode
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "Development services started"
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    print_status "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            print_success "Application is healthy and ready!"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                print_error "Application failed to start properly"
                print_status "Checking container logs..."
                docker-compose -f docker-compose.dev.yml logs app
                exit 1
            fi
            print_status "Waiting for application to be ready... (attempt $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        fi
    done
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if docker-compose -f docker-compose.dev.yml exec -T app npm run migrate; then
        print_success "Database migrations completed"
    else
        print_warning "Database migrations failed - this might be expected on first run"
    fi
}

# Setup development workflow
setup_development_workflow() {
    print_status "Setting up development workflow..."
    
    # Create development scripts
    cat > dev.sh << 'EOF'
#!/bin/bash
# Quick development commands

case "$1" in
    "start")
        docker-compose -f docker-compose.dev.yml up -d
        echo "Development environment started"
        echo "App: http://localhost:3000"
        echo "Database: localhost:5432"
        echo "Redis: localhost:6379"
        ;;
    "stop")
        docker-compose -f docker-compose.dev.yml down
        echo "Development environment stopped"
        ;;
    "restart")
        docker-compose -f docker-compose.dev.yml restart
        echo "Development environment restarted"
        ;;
    "logs")
        docker-compose -f docker-compose.dev.yml logs -f "${2:-app}"
        ;;
    "shell")
        docker-compose -f docker-compose.dev.yml exec app sh
        ;;
    "db")
        docker-compose -f docker-compose.dev.yml exec postgres psql -U echosofme -d echosofme_dev
        ;;
    "redis")
        docker-compose -f docker-compose.dev.yml exec redis redis-cli
        ;;
    "migrate")
        docker-compose -f docker-compose.dev.yml exec app npm run migrate
        ;;
    "seed")
        docker-compose -f docker-compose.dev.yml exec app npm run seed
        ;;
    "health")
        curl -f http://localhost:3000/api/health && echo " - App is healthy"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|shell|db|redis|migrate|seed|health}"
        echo ""
        echo "Commands:"
        echo "  start    - Start development environment"
        echo "  stop     - Stop development environment"
        echo "  restart  - Restart development environment"
        echo "  logs     - View logs (optionally specify service)"
        echo "  shell    - Open shell in app container"
        echo "  db       - Connect to PostgreSQL database"
        echo "  redis    - Connect to Redis"
        echo "  migrate  - Run database migrations"
        echo "  seed     - Seed database with test data"
        echo "  health   - Check application health"
        ;;
esac
EOF
    
    chmod +x dev.sh
    print_success "Development workflow scripts created"
}

# Main setup function
main() {
    echo "=========================================="
    echo "  Echoes of Me - Development Setup"
    echo "=========================================="
    echo ""
    
    check_dependencies
    check_docker
    setup_environment
    create_directories
    setup_docker_resources
    install_dependencies
    setup_database_init
    setup_development_workflow
    start_services
    run_migrations
    
    echo ""
    echo "=========================================="
    print_success "Development setup completed!"
    echo "=========================================="
    echo ""
    echo "🌐 Application: http://localhost:3000"
    echo "🗄️  Database: localhost:5432 (echosofme_dev)"
    echo "🔴 Redis: localhost:6379"
    echo ""
    echo "Quick commands:"
    echo "  ./dev.sh start    - Start development environment"
    echo "  ./dev.sh stop     - Stop development environment"
    echo "  ./dev.sh logs     - View application logs"
    echo "  ./dev.sh shell    - Open shell in app container"
    echo "  ./dev.sh db       - Connect to database"
    echo ""
    echo "Next steps:"
    echo "1. Review and customize .env.local"
    echo "2. Run './dev.sh migrate' to set up database schema"
    echo "3. Run './dev.sh seed' to add test data"
    echo "4. Visit http://localhost:3000 to start development"
    echo ""
    echo "For production deployment, see DEPLOYMENT_GUIDE.md"
}

# Handle script arguments
case "${1:-setup}" in
    "setup"|"")
        main
        ;;
    "clean")
        print_status "Cleaning up development environment..."
        docker-compose -f docker-compose.dev.yml down -v
        docker system prune -f
        print_success "Development environment cleaned"
        ;;
    "reset")
        print_status "Resetting development environment..."
        docker-compose -f docker-compose.dev.yml down -v
        docker volume rm echosofme_postgres_data echosofme_redis_data echosofme_voice_data 2>/dev/null || true
        print_success "Development environment reset"
        echo "Run './scripts/dev-setup.sh setup' to reinitialize"
        ;;
    *)
        echo "Usage: $0 [setup|clean|reset]"
        echo ""
        echo "Commands:"
        echo "  setup (default) - Full development environment setup"
        echo "  clean           - Clean up containers and unused resources"
        echo "  reset           - Reset environment (removes all data)"
        exit 1
        ;;
esac