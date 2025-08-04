#!/bin/bash
# RTX 5090 Training Launcher for "Echoes of Me"
# This script builds and starts the RTX 5090 training environment

set -e

echo "🚀 Starting RTX 5090 Training Environment for 'Echoes of Me'"
echo "============================================================"

# Check if NVIDIA Docker runtime is available
if ! docker info | grep -q nvidia; then
    echo "❌ NVIDIA Docker runtime not found. Please install nvidia-container-toolkit."
    exit 1
fi

# Check GPU availability
if ! nvidia-smi >/dev/null 2>&1; then
    echo "❌ NVIDIA GPU not detected. Please check your GPU drivers."
    exit 1
fi

# Verify RTX 5090
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits)
echo "🎮 Detected GPU: $GPU_NAME"

if [[ "$GPU_NAME" != *"RTX 5090"* ]]; then
    echo "⚠️  Warning: This script is optimized for RTX 5090. Detected: $GPU_NAME"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Training cancelled."
        exit 1
    fi
fi

# Navigate to training directory
cd "$(dirname "$0")"

echo "📦 Building RTX 5090 training container..."
docker-compose -f docker-compose.rtx5090.yml build

echo "🧹 Cleaning up any existing training containers..."
docker-compose -f docker-compose.rtx5090.yml down --remove-orphans

echo "🚀 Starting RTX 5090 training..."
docker-compose -f docker-compose.rtx5090.yml up --remove-orphans

echo "✅ Training completed or stopped."