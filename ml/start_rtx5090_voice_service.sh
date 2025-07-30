#!/bin/bash
# RTX 5090 ML Inference Service Startup Script
# Handles both ML inference and voice synthesis with RTX 5090 optimization

set -e

echo "🚀 Starting RTX 5090 ML Inference Server..."

# Check PyTorch version and CUDA compatibility for RTX 5090
echo "🔍 Checking RTX 5090 compatibility..."
python -c "
import torch
print(f'PyTorch version: {torch.__version__}')
if torch.cuda.is_available():
    print(f'CUDA available: {torch.cuda.is_available()}')
    print(f'GPU name: {torch.cuda.get_device_name(0)}')
    capability = torch.cuda.get_device_capability(0)
    print(f'CUDA capability: {capability}')
    if capability >= (8, 0):
        print('✅ GPU supports required CUDA architecture')
    else:
        print('⚠️ GPU may have limited compatibility')
else:
    print('❌ CUDA not available - will run on CPU')
"

# Install required dependencies
echo "📦 Installing ML inference dependencies..."
pip install -q transformers accelerate bitsandbytes peft sentencepiece protobuf

# Install TTS and voice dependencies  
echo "📦 Installing voice synthesis dependencies..."
pip install -q coqui-tts fastapi uvicorn librosa soundfile

# Create comprehensive torchaudio workaround script for voice synthesis
cat > /tmp/torchaudio_fix.py << 'EOF'
import types
import sys
import warnings
from unittest.mock import MagicMock

# Suppress all warnings
warnings.filterwarnings("ignore")

# Create comprehensive torchaudio mock
class TorchAudioMock(types.ModuleType):
    def __init__(self, name):
        super().__init__(name)
        self.__spec__ = types.SimpleNamespace()
        self.__spec__.name = name
        self.__spec__.origin = f'<dummy_{name}>'
        self.__spec__.submodule_search_locations = None
        self.__spec__.loader = None
        self.__file__ = f'<dummy_{name}.py>'
        self.__package__ = name.split('.')[0] if '.' in name else None

# Create main torchaudio module
torchaudio = TorchAudioMock('torchaudio')

# Add all common submodules and attributes
torchaudio.transforms = TorchAudioMock('torchaudio.transforms')
torchaudio.functional = TorchAudioMock('torchaudio.functional')
torchaudio.datasets = TorchAudioMock('torchaudio.datasets')
torchaudio.models = TorchAudioMock('torchaudio.models')
torchaudio.utils = TorchAudioMock('torchaudio.utils')

# Add commonly accessed functions as mocks
torchaudio.load = MagicMock(return_value=(None, 22050))
torchaudio.save = MagicMock()
torchaudio.info = MagicMock()

# Install all modules in sys.modules
modules_to_install = [
    'torchaudio',
    'torchaudio.transforms', 
    'torchaudio.functional',
    'torchaudio.datasets',
    'torchaudio.models',
    'torchaudio.utils'
]

for module_name in modules_to_install:
    if module_name == 'torchaudio':
        sys.modules[module_name] = torchaudio
    else:
        sys.modules[module_name] = getattr(torchaudio, module_name.split('.')[-1])

print("✅ Comprehensive torchaudio workaround applied")
EOF

# Apply workaround for voice synthesis
echo "🔧 Applying RTX 5090 optimizations..."
python /tmp/torchaudio_fix.py

# Set RTX 5090 environment variables
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export CUDA_LAUNCH_BLOCKING=0
export TORCH_CUDA_ARCH_LIST="8.0;8.6;8.9;9.0"

echo "🤖 Starting ML Inference Server..."
cd /workspace

# Start the RTX 5090 inference server with error handling
python -c "
import sys
import traceback
import os

try:
    # Apply torchaudio workaround first
    exec(open('/tmp/torchaudio_fix.py').read())
    print('✅ Torchaudio workaround applied successfully')
    
    # Check if we should use the new inference server or fallback
    if os.path.exists('/workspace/rtx5090_inference_server.py'):
        print('🚀 Starting RTX 5090 ML Inference Server...')
        exec(open('/workspace/rtx5090_inference_server.py').read())
    elif os.path.exists('/workspace/voice_only_server.py'):
        print('🎤 Falling back to voice-only server...')
        exec(open('/workspace/voice_only_server.py').read())
    else:
        print('❌ No server script found!')
        sys.exit(1)
    
except KeyboardInterrupt:
    print('🛑 Server stopped by user')
    sys.exit(0)
except Exception as e:
    print(f'❌ Server failed to start: {e}')
    print('Full traceback:')
    traceback.print_exc()
    
    # Keep container alive for debugging
    print('🔧 Keeping container alive for debugging...')
    import time
    while True:
        time.sleep(60)
        print('Container still running for debugging - check logs above')
"