#!/bin/bash

echo "=== Direct ML Inference Server Start with Fixed Dependencies ==="

# Set environment variables for optimal RTX 5090 performance
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export CUDA_VISIBLE_DEVICES=0
export COQUI_TOS_AGREED=1

# Fix dependencies without reinstalling
echo "Fixing transformers and numpy versions..."
pip install "transformers==4.35.0" "numpy>=1.24.0,<2.0" --force-reinstall --quiet

echo "=== Starting FastAPI inference server directly ==="
cd /workspace
exec python inference_server.py