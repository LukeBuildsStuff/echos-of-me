#!/bin/bash

echo "🚀 Starting RTX 5090 Training Service..."
echo "======================================"

# Set permissions
chmod +x /workspace/setup_rtx5090_training.py

# Run the setup script
echo "📋 Running RTX 5090 setup..."
python3 /workspace/setup_rtx5090_training.py

if [ $? -ne 0 ]; then
    echo "❌ RTX 5090 setup failed!"
    exit 1
fi

echo ""
echo "✅ RTX 5090 Training Environment Ready"
echo "🎯 Waiting for training jobs..."
echo ""

# Keep the container running
tail -f /dev/null