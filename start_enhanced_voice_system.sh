#!/bin/bash

# Enhanced Voice Training System Startup Script
# Comprehensive voice cloning pipeline with RTX 5090 optimization

set -e

echo "🎤 Starting Enhanced Voice Training System with RTX 5090 Optimization"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check system requirements
print_header "Checking System Requirements"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi
print_status "✓ Python 3 found"

# Check for NVIDIA GPU
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits | head -1)
    print_status "✓ NVIDIA GPU detected: $GPU_INFO"
    
    if [[ "$GPU_INFO" == *"RTX 5090"* ]]; then
        print_status "🚀 RTX 5090 detected - Optimal training performance available!"
    else
        print_warning "RTX 5090 not detected - Training will work but may be slower"
    fi
else
    print_warning "NVIDIA GPU not detected - CPU training will be used (slower)"
fi

# Check for Docker
if command -v docker &> /dev/null; then
    print_status "✓ Docker found"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found - Using local Python environment"
    DOCKER_AVAILABLE=false
fi

# Create necessary directories
print_header "Setting up directories"
mkdir -p models/voices
mkdir -p data/voice_training
mkdir -p logs
print_status "✓ Directories created"

# Install Python dependencies
print_header "Installing Python dependencies"
cd ml

# Check if virtual environment should be used
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
print_status "✓ Virtual environment activated"

# Install requirements
pip install --upgrade pip
if [ -f "requirements_voice_training.txt" ]; then
    pip install -r requirements_voice_training.txt
    print_status "✓ Voice training requirements installed"
else
    print_warning "requirements_voice_training.txt not found, installing basic requirements"
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    pip install TTS fastapi uvicorn librosa soundfile numpy scipy pydub
fi

cd ..

# Start the enhanced voice processing server
print_header "Starting Enhanced Voice Processing Server"

# Check if we should use Docker or local Python
if [ "$DOCKER_AVAILABLE" = true ] && [ -f "docker-compose.yml" ]; then
    print_status "Starting with Docker Compose..."
    
    # Update docker-compose to include enhanced voice processor
    if ! grep -q "enhanced-voice-processor" docker-compose.yml; then
        cat >> docker-compose.yml << EOF

  enhanced-voice-processor:
    build:
      context: ./ml
      dockerfile: Dockerfile.voice_enhanced
    ports:
      - "8001:8000"
    volumes:
      - ./models:/models
      - ./web/public/voices:/voices
      - ./ml:/workspace
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - NVIDIA_VISIBLE_DEVICES=all
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
EOF
    fi
    
    docker-compose up -d enhanced-voice-processor
    print_status "✓ Enhanced Voice Processing Server started in Docker"
    
else
    print_status "Starting with local Python..."
    cd ml
    source venv/bin/activate
    
    # Start the enhanced voice processor in background
    nohup python3 enhanced_voice_processor.py > ../logs/voice_processor.log 2>&1 &
    VOICE_PROCESSOR_PID=$!
    echo $VOICE_PROCESSOR_PID > ../logs/voice_processor.pid
    
    print_status "✓ Enhanced Voice Processing Server started (PID: $VOICE_PROCESSOR_PID)"
    cd ..
fi

# Wait for voice processor to be ready
print_header "Waiting for voice processor to be ready"
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        print_status "✓ Voice processor is ready!"
        break
    elif curl -s http://localhost:8001/health > /dev/null; then
        print_status "✓ Voice processor is ready on port 8001!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        print_error "Voice processor failed to start after 30 seconds"
        exit 1
    fi
    
    sleep 1
done

# Start the Next.js web application
print_header "Starting Web Application"
cd web

if [ ! -d "node_modules" ]; then
    print_status "Installing Node.js dependencies..."
    npm install
fi

# Start Next.js in development mode
print_status "Starting Next.js application..."
nohup npm run dev > ../logs/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo $NEXTJS_PID > ../logs/nextjs.pid

print_status "✓ Next.js application started (PID: $NEXTJS_PID)"
cd ..

# Wait for Next.js to be ready
print_header "Waiting for web application to be ready"
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null; then
        print_status "✓ Web application is ready!"
        break
    fi
    
    if [ $i -eq 60 ]; then
        print_error "Web application failed to start after 60 seconds"
        exit 1
    fi
    
    sleep 1
done

# Create a simple status check script
cat > check_system_status.sh << 'EOF'
#!/bin/bash

echo "🎤 Enhanced Voice Training System Status"
echo "======================================"

# Check voice processor
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Voice Processor: Running (port 8000)"
elif curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Voice Processor: Running (port 8001)"
else
    echo "❌ Voice Processor: Not running"
fi

# Check web application
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Web Application: Running (port 3000)"
else
    echo "❌ Web Application: Not running"
fi

# Check GPU availability
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits | head -1)
    echo "🔥 GPU Status: $GPU_INFO"
else
    echo "⚠️  GPU: Not available"
fi

echo ""
echo "🌐 Access your voice training system at: http://localhost:3000"
echo "📊 Voice processor API at: http://localhost:8000 or http://localhost:8001"
EOF

chmod +x check_system_status.sh

# Final status check
print_header "System Status Check"
bash check_system_status.sh

echo ""
echo "=================================================================="
print_status "🎉 Enhanced Voice Training System is now running!"
echo ""
print_status "🔗 Access your application at: http://localhost:3000"
print_status "📚 Navigate to Dashboard → Voice Clone to start recording"
print_status "🎯 Record 4 diverse passages for optimal voice quality"
print_status "⚡ RTX 5090 training takes ~2-3 minutes"
print_status "🔊 Your voice will be ready for Echo chat after training"
echo ""
print_status "📋 Logs are available in the logs/ directory"
print_status "🔧 Run ./check_system_status.sh to check system status anytime"
echo ""
echo "=================================================================="

# Save startup information
cat > system_info.json << EOF
{
  "startup_time": "$(date -Iseconds)",
  "voice_processor_pid": $(cat logs/voice_processor.pid 2>/dev/null || echo "null"),
  "nextjs_pid": $(cat logs/nextjs.pid 2>/dev/null || echo "null"),
  "gpu_available": $(command -v nvidia-smi &> /dev/null && echo "true" || echo "false"),
  "docker_used": $DOCKER_AVAILABLE,
  "web_url": "http://localhost:3000",
  "api_url": "http://localhost:8000",
  "features": [
    "4 diverse voice passages",
    "Real-time quality assessment",
    "RTX 5090 optimization",
    "XTTS-v2 voice synthesis",
    "Automatic model deployment",
    "Echo chat integration"
  ]
}
EOF

print_status "💾 System information saved to system_info.json"