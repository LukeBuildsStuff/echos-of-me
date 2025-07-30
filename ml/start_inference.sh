#!/bin/bash

echo "=== Starting ML Inference Server with RTX 5090 Support ==="
echo "Installing voice cloning dependencies..."

# Install voice cloning dependencies with compatible versions
# Fix numpy and transformers for TTS compatibility
pip install --no-cache-dir "numpy>=1.24.0,<1.26.0" --force-reinstall
pip install --no-cache-dir "transformers==4.33.0" --force-reinstall

# Install torchaudio that matches the PyTorch version
pip install --no-cache-dir torchaudio --index-url https://download.pytorch.org/whl/cu124

# Install TTS dependencies first
pip install --no-cache-dir coqpit anyascii num2words pysbd
pip install --no-cache-dir gruut==2.2.3 encodec

# Install TTS with compatible version
pip install --no-cache-dir "coqui-tts==0.21.1" --no-deps

# Install remaining dependencies
pip install --no-cache-dir soundfile==0.12.1 librosa==0.10.1 resampy==0.4.3
pip install --no-cache-dir fastapi uvicorn python-multipart
pip install --no-cache-dir psycopg2-binary python-dotenv httpx
pip install --no-cache-dir pydantic
pip install --no-cache-dir datasets accelerate peft

echo "=== Dependencies installed successfully ==="

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

# Test torchaudio import
try:
    import torchaudio
    print(f'torchaudio version: {torchaudio.__version__}')
    print('✓ torchaudio available')
except ImportError as e:
    print(f'✗ torchaudio import failed: {e}')

# Test TTS import
try:
    from TTS.api import TTS
    print('✓ TTS library available')
except ImportError as e:
    print(f'✗ TTS import failed: {e}')
"

echo "=== Starting FastAPI inference server ==="
cd /workspace
python inference_server.py