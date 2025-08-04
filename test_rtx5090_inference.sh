#!/bin/bash

# Test RTX 5090 Inference Engine in Docker Container
# This script runs the inference engine inside the container with proper RTX 5090 support

echo "Testing RTX 5090 Inference Engine in Docker Container..."
echo "=================================================="

# Check if the container exists and is running
if ! docker ps | grep -q echosofme_app; then
    echo "ERROR: echosofme_app container is not running"
    echo "Please start the container first with: docker-compose up -d"
    exit 1
fi

echo "1. Testing GPU detection and model loading status..."
echo "----------------------------------------------------"
docker exec echosofme_app python /app/luke_ai_inference_engine.py status

echo ""
echo "2. Testing inference with GPU acceleration..."
echo "--------------------------------------------"
docker exec echosofme_app python /app/luke_ai_inference_engine.py "Tell me about perseverance and growth"

echo ""
echo "3. Running GPU diagnostic check..."
echo "---------------------------------"
docker exec echosofme_app nvidia-smi

echo ""
echo "4. Checking PyTorch version and CUDA support in container..."
echo "----------------------------------------------------------"
docker exec echosofme_app python -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA version: {torch.version.cuda}')
    print(f'GPU name: {torch.cuda.get_device_name(0)}')
    print(f'CUDA capability: sm_{torch.cuda.get_device_capability(0)[0]}{torch.cuda.get_device_capability(0)[1]}')
    print(f'GPU memory: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f}GB')
"

echo ""
echo "Test completed! Check the output above for RTX 5090 utilization."