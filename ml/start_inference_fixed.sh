#!/bin/bash

echo "=== Starting ML Inference Server with RTX 5090 Support ==="
echo "PyTorch Container: nvcr.io/nvidia/pytorch:25.04-py3"

# Function to check if a package is installed
check_package() {
    python -c "import $1" 2>/dev/null
    return $?
}

# Function to install torchaudio with multiple fallback strategies
install_torchaudio() {
    echo "=== Installing torchaudio ==="
    
    # Get PyTorch version info
    PYTORCH_VERSION=$(python -c "import torch; print(torch.__version__)")
    CUDA_VERSION=$(python -c "import torch; print(torch.version.cuda)")
    echo "PyTorch version: $PYTORCH_VERSION"
    echo "CUDA version: $CUDA_VERSION"
    
    # Strategy 1: Try CUDA 12.4 wheel (most compatible)
    echo "Trying CUDA 12.4 torchaudio wheel..."
    if pip install --no-cache-dir torchaudio --index-url https://download.pytorch.org/whl/cu124; then
        if check_package "torchaudio"; then
            echo "✓ torchaudio installed successfully with CUDA 12.4 wheel"
            return 0
        fi
    fi
    
    # Strategy 2: Try CUDA 12.1 wheel
    echo "Trying CUDA 12.1 torchaudio wheel..."
    if pip install --no-cache-dir torchaudio --index-url https://download.pytorch.org/whl/cu121; then
        if check_package "torchaudio"; then
            echo "✓ torchaudio installed successfully with CUDA 12.1 wheel"
            return 0
        fi
    fi
    
    # Strategy 3: Try CPU version (will work but slower)
    echo "Trying CPU torchaudio wheel..."
    if pip install --no-cache-dir torchaudio --index-url https://download.pytorch.org/whl/cpu; then
        if check_package "torchaudio"; then
            echo "⚠ torchaudio installed with CPU support (GPU acceleration disabled)"
            return 0
        fi
    fi
    
    # Strategy 4: Try from conda-forge
    echo "Trying conda installation..."
    if command -v conda &> /dev/null; then
        if conda install -y -c conda-forge torchaudio; then
            if check_package "torchaudio"; then
                echo "✓ torchaudio installed successfully with conda"
                return 0
            fi
        fi
    fi
    
    # Strategy 5: Build from source (last resort)
    echo "⚠ All wheel installations failed. This container may have PyTorch built from source."
    echo "Installing torchaudio dependencies for source build..."
    apt-get update && apt-get install -y build-essential cmake
    pip install --no-cache-dir torchaudio
    
    if check_package "torchaudio"; then
        echo "✓ torchaudio installed from source"
        return 0
    else
        echo "✗ Failed to install torchaudio"
        return 1
    fi
}

# Install system dependencies if needed
echo "=== Installing system dependencies ==="
apt-get update && apt-get install -y ffmpeg espeak-ng espeak-ng-data libsndfile1 2>/dev/null || echo "Some system packages may already be installed"

# Install torchaudio
if ! check_package "torchaudio"; then
    install_torchaudio
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install torchaudio. Voice cloning will be disabled."
        export TTS_DISABLED=1
    fi
else
    echo "✓ torchaudio already available"
fi

# Install other audio dependencies
echo "=== Installing audio processing libraries ==="
pip install --no-cache-dir soundfile==0.12.1 librosa==0.10.1 resampy==0.4.3

# Install TTS
echo "=== Installing Coqui TTS ==="
if [ "$TTS_DISABLED" != "1" ]; then
    pip install --no-cache-dir coqui-tts==0.24.3
else
    echo "⚠ Skipping TTS installation due to torchaudio issues"
fi

# Install web framework dependencies
echo "=== Installing web framework dependencies ==="
pip install --no-cache-dir fastapi uvicorn python-multipart
pip install --no-cache-dir psycopg2-binary python-dotenv httpx
pip install --no-cache-dir pydantic
pip install --no-cache-dir transformers datasets accelerate peft

echo "=== Dependencies installation completed ==="

# Set environment variables for optimal RTX 5090 performance
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export CUDA_VISIBLE_DEVICES=0
export COQUI_TOS_AGREED=1

echo "=== Verifying RTX 5090 CUDA support ==="
python -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'CUDA version: {torch.version.cuda}')
if torch.cuda.is_available():
    print(f'GPU name: {torch.cuda.get_device_name(0)}')
    print(f'GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
    print(f'GPU compute capability: {torch.cuda.get_device_capability(0)}')
else:
    print('No CUDA devices detected')

# Test torchaudio
try:
    import torchaudio
    print(f'torchaudio version: {torchaudio.__version__}')
    print('✓ torchaudio available')
except ImportError as e:
    print(f'❌ torchaudio not available: {e}')

# Test TTS
try:
    from TTS.api import TTS
    print('✓ TTS library available')
except ImportError as e:
    print(f'❌ TTS library not available: {e}')
"

echo "=== Starting FastAPI inference server ==="
cd /workspace
python inference_server.py