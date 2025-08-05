#!/bin/bash

# Jose Character Training Launcher - RTX 5090 Optimized
# Author: Claude Code (LLM Fine-tuning Specialist)

set -e  # Exit on any error

echo "🎭 Jose Character Fine-tuning Pipeline - RTX 5090"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "jose_rtx5090_training.py" ]; then
    echo "❌ Error: jose_rtx5090_training.py not found in current directory"
    echo "Please run this script from /home/luke/personal-ai-clone/web/training/"
    exit 1
fi

# Create necessary directories
echo "📁 Creating training directories..."
mkdir -p jose_checkpoints
mkdir -p jose_logs
mkdir -p jose_final_model

# Check GPU
echo "🖥️ Checking RTX 5090 GPU..."
if ! nvidia-smi > /dev/null 2>&1; then
    echo "❌ Error: nvidia-smi not found. Please ensure NVIDIA drivers are installed."
    exit 1
fi

# Check GPU memory
GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
if [ "$GPU_MEMORY" -lt 20000 ]; then
    echo "❌ Error: Insufficient GPU memory: ${GPU_MEMORY}MB. RTX 5090 with 24GB required."
    exit 1
fi

echo "✅ GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)"
echo "✅ GPU Memory: ${GPU_MEMORY}MB"

# Check Python and dependencies
echo "🐍 Checking Python environment..."
echo "Using system Python: $(python3 --version)"

# Check if key packages are available (skip installation if already present)
echo "📦 Checking Jose training requirements..."
python3 -c "import torch, transformers, peft; print('✅ Key packages available')" || {
    echo "❌ Missing key packages. Please install manually:"
    echo "pip3 install torch transformers peft accelerate bitsandbytes datasets"
    exit 1
}

# Verify key dependencies
echo "🔍 Verifying key dependencies..."
python3 -c "import torch; print(f'PyTorch: {torch.__version__}')"
python3 -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}')"
python3 -c "import torch; print(f'GPU Count: {torch.cuda.device_count()}')" 
python3 -c "import transformers; print(f'Transformers: {transformers.__version__}')"
python3 -c "import peft; print(f'PEFT: {peft.__version__}')"

# Check if Jose data exists
echo "📊 Checking Jose training data..."
if [ ! -f "../jose_formatted_training.json" ]; then
    echo "❌ Error: Jose training data not found at ../jose_formatted_training.json"
    echo "Please run the data extraction script first."
    exit 1
fi

JOSE_DATA_SIZE=$(wc -l < ../jose_formatted_training.json)
echo "✅ Jose training data found: $JOSE_DATA_SIZE lines"

# Set optimal environment variables for RTX 5090
echo "⚙️ Setting RTX 5090 optimizations..."
export CUDA_VISIBLE_DEVICES=0
export TORCH_CUDA_ARCH_LIST="9.0"  # RTX 5090 architecture
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export TOKENIZERS_PARALLELISM=false  # Avoid warnings

# Set HuggingFace cache to avoid space issues
export HF_HOME=/tmp/huggingface_cache
mkdir -p $HF_HOME

# Memory optimization flags
export OMP_NUM_THREADS=8
export MKL_NUM_THREADS=8

# Start training with monitoring
echo "🚀 Starting Jose character training..."
echo "Training will be logged to jose_training.log"
echo "Monitor GPU usage with: watch -n 1 nvidia-smi"

# Run the training
python3 jose_rtx5090_training.py 2>&1 | tee jose_training_$(date +%Y%m%d_%H%M%S).log

# Check if training completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Jose Character Training Completed Successfully!"
    echo "=================================================="
    echo "📁 Model saved to: jose_final_model/"
    echo "📊 Logs available in: jose_logs/"
    echo "💾 Checkpoints in: jose_checkpoints/"
    echo ""
    echo "Next steps:"
    echo "1. Test the Jose model with: python3 test_jose_model.py"
    echo "2. Deploy to localhost:8000 with deployment script"
    echo ""
else
    echo ""
    echo "❌ Jose Character Training Failed!"
    echo "================================="
    echo "Check the logs above for error details."
    echo "Common issues:"
    echo "- Insufficient GPU memory (need 24GB RTX 5090)"
    echo "- Missing dependencies (check pip install)"
    echo "- Data format issues (verify jose_formatted_training.json)"
    exit 1
fi