#!/bin/bash

# RTX 5090 Inference Launch Script
# Uses NVIDIA PyTorch container with sm_120 support

echo "Starting RTX 5090 Inference Server with PyTorch 2.7.0a0+ support..."

# Check if NVIDIA runtime is available
if ! docker info | grep -q nvidia; then
    echo "Error: NVIDIA Docker runtime not found. Please install nvidia-container-toolkit"
    exit 1
fi

# Check for GPU
if ! nvidia-smi > /dev/null 2>&1; then
    echo "Error: nvidia-smi not found or GPU not accessible"
    exit 1
fi

# Launch container with RTX 5090 support
docker run --rm -it \
    --runtime=nvidia \
    --gpus all \
    -e NVIDIA_VISIBLE_DEVICES=0 \
    -e CUDA_VISIBLE_DEVICES=0 \
    -v $(pwd):/app \
    -w /app \
    nvcr.io/nvidia/pytorch:25.04-py3 \
    bash -c "
        echo 'Installing required packages...'
        pip install transformers peft accelerate --quiet
        
        echo 'Verifying RTX 5090 compatibility...'
        python3 -c '
import torch
print(f\"PyTorch version: {torch.__version__}\")
print(f\"CUDA available: {torch.cuda.is_available()}\")
print(f\"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"No GPU\"}\")
print(f\"CUDA capability: {torch.cuda.get_device_capability(0) if torch.cuda.is_available() else \"N/A\"}\")

# Test RTX 5090 functionality
if torch.cuda.is_available():
    test = torch.randn(1000, 1000).cuda()
    result = test @ test
    print(\"RTX 5090 CUDA test: PASSED\")
else:
    print(\"RTX 5090 CUDA test: FAILED\")
        '
        
        echo 'Starting Luke AI inference...'
        python3 luke_ai_inference_engine.py status
    "