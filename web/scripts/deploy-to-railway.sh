#!/bin/bash

# Railway Deployment Script for EchosOfMe
# This script handles the deployment process to Railway with proper environment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🚀 Starting Railway deployment for EchosOfMe"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    print_info "Install Railway CLI:"
    print_info "  npm install -g @railway/cli"
    print_info "  or"
    print_info "  curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

print_status "Railway CLI is available"

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    print_info "Not logged into Railway. Please login:"
    railway login
fi

RAILWAY_USER=$(railway whoami)
print_status "Logged in as: $RAILWAY_USER"

# Environment selection
echo ""
print_info "Select deployment environment:"
echo "1) Production"
echo "2) Staging"
echo "3) Development"
read -p "Enter your choice (1-3): " env_choice

case $env_choice in
    1)
        ENVIRONMENT="production"
        ENV_FILE=".env.production"
        ;;
    2)
        ENVIRONMENT="staging"
        ENV_FILE=".env.staging"
        ;;
    3)
        ENVIRONMENT="development"
        ENV_FILE=".env.local"
        ;;
    *)
        print_error "Invalid choice. Defaulting to production."
        ENVIRONMENT="production"
        ENV_FILE=".env.production"
        ;;
esac

print_info "Deploying to: $ENVIRONMENT"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE not found"
    print_info "Creating from template..."
    
    if [ -f ".env.example" ]; then
        cp .env.example $ENV_FILE
        print_info "Please edit $ENV_FILE with your actual values"
        read -p "Press Enter when you've updated the environment file..."
    else
        print_error "No environment template found. Please create $ENV_FILE manually."
        exit 1
    fi
fi

# Validate required environment variables
print_info "Validating environment configuration..."

REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "REDIS_URL"
)

MISSING_VARS=()
while IFS= read -r line; do
    if [[ $line =~ ^[A-Z_]+=.+ ]]; then
        var_name=$(echo $line | cut -d'=' -f1)
        var_value=$(echo $line | cut -d'=' -f2-)
        
        # Check if it's a required variable and if it has a placeholder value
        for required_var in "${REQUIRED_VARS[@]}"; do
            if [[ "$var_name" == "$required_var" ]]; then
                if [[ "$var_value" == *"your-"* ]] || [[ "$var_value" == *"replace-"* ]] || [[ -z "$var_value" ]]; then
                    MISSING_VARS+=("$var_name")
                fi
            fi
        done
    fi
done < "$ENV_FILE"

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Please update these environment variables in $ENV_FILE:"
    for var in "${MISSING_VARS[@]}"; do
        print_error "  - $var"
    done
    exit 1
fi

print_status "Environment configuration validated"

# Build check
print_info "Running pre-deployment checks..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

# Run linting
print_info "Running linter..."
if npm run lint; then
    print_status "Linting passed"
else
    print_warning "Linting issues found. Continue anyway? (y/n)"
    read -r continue_lint
    if [[ $continue_lint != "y" ]]; then
        exit 1
    fi
fi

# Test build
print_info "Testing build process..."
if npm run build; then
    print_status "Build test successful"
    # Clean up test build
    rm -rf .next
else
    print_error "Build failed. Please fix build errors before deploying."
    exit 1
fi

# Initialize or link Railway project
if [ ! -f "railway.json" ] && [ ! -f ".railway" ]; then
    print_info "No Railway project found. Creating new project..."
    railway init
else
    print_status "Railway project found"
fi

# Set environment variables in Railway
print_info "Uploading environment variables to Railway..."

# Function to set Railway environment variable
set_railway_var() {
    local var_name=$1
    local var_value=$2
    
    if [ ! -z "$var_value" ]; then
        railway variables set $var_name="$var_value" --environment $ENVIRONMENT
        print_status "Set $var_name"
    fi
}

# Read and set environment variables
while IFS= read -r line; do
    if [[ $line =~ ^[A-Z_]+=.+ ]] && [[ ! $line =~ ^# ]]; then
        var_name=$(echo $line | cut -d'=' -f1)
        var_value=$(echo $line | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
        
        # Skip comment lines and empty values
        if [[ ! -z "$var_value" ]] && [[ "$var_value" != \#* ]]; then
            set_railway_var "$var_name" "$var_value"
        fi
    fi
done < "$ENV_FILE"

# Set Railway-specific variables
railway variables set NODE_ENV="production" --environment $ENVIRONMENT
railway variables set RAILWAY_ENVIRONMENT="$ENVIRONMENT" --environment $ENVIRONMENT

print_status "Environment variables uploaded"

# Database migration check
print_info "Checking database migration status..."
if [[ "$ENV_FILE" == *"production"* ]]; then
    print_warning "This is a production deployment. Run database migration? (y/n)"
    read -r run_migration
    if [[ $run_migration == "y" ]]; then
        print_info "Running production database migration..."
        # Set temporary environment for migration
        export $(cat $ENV_FILE | grep -v ^# | xargs)
        node scripts/migrate-production.js
        print_status "Database migration completed"
    fi
fi

# Deploy to Railway
print_info "Starting Railway deployment..."
print_info "This may take several minutes..."

# Deploy with specific environment
if railway deploy --environment $ENVIRONMENT; then
    print_status "🎉 Deployment successful!"
    
    # Get deployment URL
    DEPLOYMENT_URL=$(railway domain --environment $ENVIRONMENT 2>/dev/null || echo "Not available")
    if [ "$DEPLOYMENT_URL" != "Not available" ]; then
        print_info "🌐 Your application is available at: $DEPLOYMENT_URL"
    fi
    
    # Show deployment info
    print_info "📊 Deployment Information:"
    railway status --environment $ENVIRONMENT
    
else
    print_error "Deployment failed"
    print_info "Check Railway logs for more details:"
    print_info "  railway logs --environment $ENVIRONMENT"
    exit 1
fi

# Post-deployment checks
print_info "Running post-deployment health checks..."

if [ "$DEPLOYMENT_URL" != "Not available" ]; then
    # Wait a moment for the service to start
    sleep 10
    
    # Health check
    if curl -f "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
        print_status "Health check passed"
    else
        print_warning "Health check failed. The service might still be starting up."
        print_info "Monitor the deployment: railway logs --environment $ENVIRONMENT"
    fi
fi

# Display useful commands
echo ""
print_info "📋 Useful Railway commands:"
print_info "  View logs: railway logs --environment $ENVIRONMENT"
print_info "  Open dashboard: railway open --environment $ENVIRONMENT"
print_info "  Check status: railway status --environment $ENVIRONMENT"
print_info "  Rollback: railway rollback --environment $ENVIRONMENT"

echo ""
print_status "🚀 Deployment completed successfully!"

# Optional: Open the deployed application
if [ "$DEPLOYMENT_URL" != "Not available" ]; then
    read -p "Open the deployed application in browser? (y/n): " open_browser
    if [[ $open_browser == "y" ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$DEPLOYMENT_URL"
        elif command -v open &> /dev/null; then
            open "$DEPLOYMENT_URL"
        else
            print_info "Please open: $DEPLOYMENT_URL"
        fi
    fi
fi