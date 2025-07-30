#!/usr/bin/env python3
"""
RTX 5090 Training Environment Setup Script
Ensures all dependencies and optimizations are properly configured
"""

import os
import sys
import subprocess
import torch
import json
from pathlib import Path

def run_command(cmd, check=True):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {cmd}")
        print(f"Error: {e.stderr}")
        if check:
            raise
        return None

def check_gpu_compatibility():
    """Check RTX 5090 compatibility and capabilities"""
    print("🔍 Checking GPU compatibility...")
    
    if not torch.cuda.is_available():
        print("❌ CUDA is not available!")
        return False
    
    gpu_count = torch.cuda.device_count()
    print(f"✅ Found {gpu_count} GPU(s)")
    
    for i in range(gpu_count):
        props = torch.cuda.get_device_properties(i)
        capability = torch.cuda.get_device_capability(i)
        
        print(f"GPU {i}: {props.name}")
        print(f"  - Memory: {props.total_memory / 1024**3:.1f} GB")
        print(f"  - Compute Capability: sm_{capability[0]}{capability[1]}")
        
        # Check for RTX 5090 (sm_120)
        if capability[0] >= 12:
            print(f"  - ✅ RTX 5090 sm_120 support confirmed")
        else:
            print(f"  - ⚠️  Expected RTX 5090 (sm_120), found sm_{capability[0]}{capability[1]}")
    
    return True

def install_dependencies():
    """Install and verify RTX 5090 optimized packages"""
    print("\n📦 Installing RTX 5090 optimized packages...")
    
    # Core ML packages
    packages = [
        "transformers>=4.36.0",
        "datasets>=2.15.0",
        "accelerate>=0.25.0",
        "peft>=0.7.0",
        "bitsandbytes>=0.41.0",
        "torch>=2.1.0",
        "torchaudio>=2.1.0",
        "torchvision>=0.16.0",
        "sentencepiece",
        "protobuf",
        "psutil",
        "GPUtil",
        "tensorboard",
        "wandb",
        "scipy",
        "scikit-learn",
        "matplotlib",
        "seaborn"
    ]
    
    for package in packages:
        print(f"Installing {package}...")
        try:
            run_command(f"pip install --upgrade {package}")
            print(f"✅ {package} installed")
        except:
            print(f"❌ Failed to install {package}")
    
    # Try to install Flash Attention 2 for RTX 5090
    print("\n🚀 Installing Flash Attention 2 for RTX 5090...")
    try:
        # Flash Attention 2 with RTX 5090 support
        run_command("pip install flash-attn --no-build-isolation", check=False)
        
        # Test Flash Attention 2
        try:
            from flash_attn import flash_attn_func
            print("✅ Flash Attention 2 successfully installed and available")
        except ImportError:
            print("⚠️  Flash Attention 2 installed but not importable")
    except:
        print("❌ Flash Attention 2 installation failed (this is optional)")

def setup_cuda_environment():
    """Configure CUDA environment for RTX 5090"""
    print("\n⚙️ Configuring CUDA environment for RTX 5090...")
    
    cuda_env = {
        'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:1024,garbage_collection_threshold:0.8,expandable_segments:True',
        'CUDA_LAUNCH_BLOCKING': '0',  # Enable async execution
        'CUDA_VISIBLE_DEVICES': '0',  # Use first GPU
        'NCCL_DEBUG': 'INFO',
        'PYTHONPATH': '/workspace:/models:/data'
    }
    
    for key, value in cuda_env.items():
        os.environ[key] = value
        print(f"Set {key}={value}")
    
    # Test CUDA memory allocation
    try:
        test_tensor = torch.randn(1000, 1000, device='cuda')
        memory_allocated = torch.cuda.memory_allocated(0) / 1024**3
        print(f"✅ CUDA test successful, allocated {memory_allocated:.2f} GB")
        del test_tensor
        torch.cuda.empty_cache()
    except Exception as e:
        print(f"❌ CUDA test failed: {e}")

def create_training_directories():
    """Create necessary directories for training"""
    print("\n📁 Creating training directories...")
    
    directories = [
        '/workspace/training_data',
        '/workspace/models',
        '/workspace/checkpoints',
        '/workspace/logs',
        '/workspace/scripts',
        '/models/huggingface',
        '/models/trained',
        '/data/processed'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created {directory}")

def test_model_loading():
    """Test loading a small model to verify everything works"""
    print("\n🧪 Testing model loading...")
    
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        
        model_name = "microsoft/DialoGPT-small"  # Small test model
        
        print(f"Loading tokenizer for {model_name}...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        print(f"Loading model {model_name}...")
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        
        print("✅ Model loading test successful")
        
        # Test a simple forward pass
        inputs = tokenizer("Hello, RTX 5090!", return_tensors="pt")
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
        
        print("✅ Forward pass test successful")
        
        # Clean up
        del model
        del tokenizer
        torch.cuda.empty_cache()
        
    except Exception as e:
        print(f"❌ Model loading test failed: {e}")

def save_system_info():
    """Save system information for debugging"""
    print("\n💾 Saving system information...")
    
    system_info = {
        'pytorch_version': torch.__version__,
        'cuda_available': torch.cuda.is_available(),
        'cuda_version': torch.version.cuda if torch.cuda.is_available() else None,
        'gpu_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
        'python_version': sys.version,
        'environment_variables': dict(os.environ)
    }
    
    if torch.cuda.is_available():
        gpu_info = []
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            capability = torch.cuda.get_device_capability(i)
            gpu_info.append({
                'device_id': i,
                'name': props.name,
                'total_memory_gb': props.total_memory / 1024**3,
                'compute_capability': f"sm_{capability[0]}{capability[1]}",
                'major': capability[0],
                'minor': capability[1]
            })
        system_info['gpu_info'] = gpu_info
    
    # Check for Flash Attention 2
    try:
        from flash_attn import flash_attn_func
        system_info['flash_attention_2'] = True
    except ImportError:
        system_info['flash_attention_2'] = False
    
    # Save to file
    with open('/workspace/system_info.json', 'w') as f:
        json.dump(system_info, f, indent=2, default=str)
    
    print("✅ System information saved to /workspace/system_info.json")

def main():
    """Main setup function"""
    print("🚀 RTX 5090 Training Environment Setup Starting...")
    print("=" * 60)
    
    try:
        # Check GPU compatibility
        if not check_gpu_compatibility():
            print("❌ GPU compatibility check failed!")
            return False
        
        # Install dependencies
        install_dependencies()
        
        # Setup CUDA environment
        setup_cuda_environment()
        
        # Create directories
        create_training_directories()
        
        # Test model loading
        test_model_loading()
        
        # Save system info
        save_system_info()
        
        print("\n" + "=" * 60)
        print("✅ RTX 5090 Training Environment Setup Complete!")
        print("🎯 Ready for high-performance LLM training")
        
        # Display final status
        if torch.cuda.is_available():
            memory_total = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"💾 GPU Memory Available: {memory_total:.1f} GB")
            capability = torch.cuda.get_device_capability(0)
            print(f"⚡ Compute Capability: sm_{capability[0]}{capability[1]}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Setup failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)