#!/bin/bash

# Cloudflare Tunnel Setup Script for RTX 5090 Hybrid Architecture
# This script sets up the tunnel connection between your local RTX 5090 and the cloud

set -e  # Exit on any error

echo "🚀 Setting up Cloudflare Tunnel for RTX 5090 Hybrid Architecture"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    print_error "cloudflared is not installed"
    print_info "Please install cloudflared first:"
    print_info "  Linux: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb"
    print_info "  macOS: brew install cloudflare/cloudflare/cloudflared"
    print_info "  Windows: Download from https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

print_status "cloudflared is installed"

# Check if user has Cloudflare account token
if [ -z "$CLOUDFLARE_TOKEN" ]; then
    print_warning "CLOUDFLARE_TOKEN environment variable not set"
    print_info "Please set your Cloudflare API token:"
    print_info "  export CLOUDFLARE_TOKEN=your_token_here"
    print_info "  Or add it to your .env file"
    print_info "Get your token from: https://dash.cloudflare.com/profile/api-tokens"
    read -p "Enter your Cloudflare API token: " CLOUDFLARE_TOKEN
    export CLOUDFLARE_TOKEN
fi

# Create tunnel
TUNNEL_NAME="echosofme-rtx-tunnel"
print_info "Creating Cloudflare tunnel: $TUNNEL_NAME"

# Login to Cloudflare (if not already authenticated)
if [ ! -f ~/.cloudflared/cert.pem ]; then
    print_info "Authenticating with Cloudflare..."
    cloudflared tunnel login
    print_status "Authenticated with Cloudflare"
fi

# Create the tunnel
print_info "Creating tunnel..."
TUNNEL_ID=$(cloudflared tunnel create $TUNNEL_NAME 2>/dev/null | grep -o '[a-f0-9]\{8\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{12\}' || true)

if [ -z "$TUNNEL_ID" ]; then
    # Tunnel might already exist, try to get its ID
    TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}' || true)
    if [ -z "$TUNNEL_ID" ]; then
        print_error "Failed to create or find tunnel"
        exit 1
    else
        print_warning "Tunnel already exists with ID: $TUNNEL_ID"
    fi
else
    print_status "Created tunnel with ID: $TUNNEL_ID"
fi

# Create DNS records for RTX services
DOMAIN=${CLOUDFLARE_DOMAIN:-"your-domain.com"}
if [ "$DOMAIN" = "your-domain.com" ]; then
    print_warning "Using default domain. Please set CLOUDFLARE_DOMAIN environment variable"
    read -p "Enter your domain name: " DOMAIN
fi

print_info "Setting up DNS records for domain: $DOMAIN"

# DNS records for RTX services
RTX_SERVICES=("rtx-training" "rtx-inference" "rtx-voice" "rtx-monitor")

for SERVICE in "${RTX_SERVICES[@]}"; do
    print_info "Creating DNS record for $SERVICE.$DOMAIN"
    cloudflared tunnel route dns $TUNNEL_ID $SERVICE.$DOMAIN 2>/dev/null || print_warning "DNS record for $SERVICE.$DOMAIN may already exist"
done

print_status "DNS records configured"

# Create the configuration file
print_info "Creating tunnel configuration..."
cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /home/$(whoami)/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: rtx-training.$DOMAIN
    service: http://localhost:8000
    originRequest:
      httpHostHeader: localhost:8000
      connectTimeout: 30s
      tlsTimeout: 10s
      tcpKeepAlive: 30s
      keepAliveTimeout: 90s
      keepAliveConnections: 10

  - hostname: rtx-inference.$DOMAIN
    service: http://localhost:8001
    originRequest:
      httpHostHeader: localhost:8001
      connectTimeout: 10s
      tlsTimeout: 5s

  - hostname: rtx-voice.$DOMAIN
    service: http://localhost:8002
    originRequest:
      httpHostHeader: localhost:8002
      connectTimeout: 20s
      tlsTimeout: 10s

  - hostname: rtx-monitor.$DOMAIN
    service: http://localhost:9000
    originRequest:
      httpHostHeader: localhost:9000
      noTLSVerify: true

  - service: http_status:404

autoupdate-freq: 24h
loglevel: info
metrics: localhost:8080
EOF

print_status "Configuration file created at ~/.cloudflared/config.yml"

# Create systemd service for automatic startup
if command -v systemctl &> /dev/null; then
    print_info "Installing systemd service..."
    sudo cloudflared service install
    sudo systemctl enable cloudflared
    print_status "Systemd service installed and enabled"
fi

# Create startup script
print_info "Creating startup script..."
cat > ~/start-rtx-tunnel.sh << 'EOF'
#!/bin/bash

# RTX 5090 Tunnel Startup Script
echo "🚀 Starting RTX 5090 Cloudflare Tunnel..."

# Check if RTX services are running
RTX_SERVICES=(8000 8001 8002)
MISSING_SERVICES=()

for PORT in "${RTX_SERVICES[@]}"; do
    if ! nc -z localhost $PORT 2>/dev/null; then
        MISSING_SERVICES+=($PORT)
    fi
done

if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
    echo "⚠️  Warning: The following RTX services are not running:"
    for PORT in "${MISSING_SERVICES[@]}"; do
        echo "   - localhost:$PORT"
    done
    echo "Please start your RTX services before running the tunnel"
fi

# Start the tunnel
cloudflared tunnel run
EOF

chmod +x ~/start-rtx-tunnel.sh
print_status "Startup script created at ~/start-rtx-tunnel.sh"

# Create environment variables for the application
print_info "Creating environment variables..."
cat >> .env.local << EOF

# RTX 5090 Cloudflare Tunnel Configuration
RTX_GPU_ENDPOINT=https://rtx-training.$DOMAIN
RTX_INFERENCE_ENDPOINT=https://rtx-inference.$DOMAIN
RTX_VOICE_ENDPOINT=https://rtx-voice.$DOMAIN
RTX_MONITOR_ENDPOINT=https://rtx-monitor.$DOMAIN
CLOUDFLARE_TUNNEL_ID=$TUNNEL_ID
CLOUDFLARE_DOMAIN=$DOMAIN
EOF

print_status "Environment variables added to .env.local"

# Test tunnel configuration
print_info "Testing tunnel configuration..."
if cloudflared tunnel ingress validate ~/.cloudflared/config.yml; then
    print_status "Tunnel configuration is valid"
else
    print_error "Tunnel configuration validation failed"
    exit 1
fi

print_status "🎉 Cloudflare Tunnel setup completed successfully!"
print_info ""
print_info "Next steps:"
print_info "1. Start your RTX 5090 services on ports 8000, 8001, 8002"
print_info "2. Run the tunnel: ~/start-rtx-tunnel.sh or 'cloudflared tunnel run'"
print_info "3. Your RTX services will be available at:"
print_info "   - Training: https://rtx-training.$DOMAIN"
print_info "   - Inference: https://rtx-inference.$DOMAIN"
print_info "   - Voice: https://rtx-voice.$DOMAIN"
print_info "   - Monitor: https://rtx-monitor.$DOMAIN"
print_info ""
print_info "To start tunnel automatically on boot:"
print_info "  sudo systemctl start cloudflared"
print_info ""
print_info "Monitor tunnel status:"
print_info "  cloudflared tunnel info $TUNNEL_NAME"