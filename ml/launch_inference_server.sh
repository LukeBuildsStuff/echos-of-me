#!/bin/bash
# Quick launcher for RTX 5090 Inference Server
# Can be used outside of Docker for development

set -e

echo "🚀 RTX 5090 Inference Server Launcher"
echo "======================================"

# Check if we're in Docker or local environment
if [ -f /.dockerenv ]; then
    echo "Running in Docker container"
    WORKSPACE_DIR="/workspace"
else
    echo "Running in local environment"
    WORKSPACE_DIR="$(dirname "$0")"
fi

cd "$WORKSPACE_DIR"

# Check Python and dependencies
echo "🔍 Checking Python environment..."
python -c "
import sys
print(f'Python: {sys.version}')
try:
    import torch
    print(f'PyTorch: {torch.__version__}')
    if torch.cuda.is_available():
        print(f'CUDA: Available - {torch.cuda.get_device_name(0)}')
        print(f'CUDA Capability: {torch.cuda.get_device_capability(0)}')
    else:
        print('CUDA: Not available')
except ImportError:
    print('PyTorch: Not installed')
    exit(1)
"

# Install dependencies if needed
if [ ! -f requirements_inference.txt ]; then
    echo "❌ requirements_inference.txt not found"
    exit 1
fi

echo "📦 Installing dependencies..."
pip install -q -r requirements_inference.txt

# Check for models
echo "🔍 Checking for models..."
if [ -d "/models" ]; then
    echo "Models directory found: /models"
    find /models -name "config.json" -type f | head -3 | while read model; do
        echo "  Found model: $(dirname "$model")"
    done
else
    echo "⚠️ No /models directory found - will use default models"
fi

# Launch server
echo "🚀 Starting RTX 5090 Inference Server..."
if [ -f "$WORKSPACE_DIR/rtx5090_inference_server.py" ]; then
    python "$WORKSPACE_DIR/rtx5090_inference_server.py"
else
    echo "❌ rtx5090_inference_server.py not found in $WORKSPACE_DIR"
    exit 1
fi