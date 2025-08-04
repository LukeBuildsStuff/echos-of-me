#!/usr/bin/env python3
"""
RTX 5090 Compatibility Verification Script
Quick verification of PyTorch, CUDA, and RTX 5090 setup
"""

import torch
import sys

def verify_rtx5090_compatibility():
    """Verify RTX 5090 compatibility"""
    print("🔍 RTX 5090 Compatibility Check")
    print("="*40)
    
    # Check PyTorch version
    pytorch_version = torch.__version__
    print(f"PyTorch version: {pytorch_version}")
    
    # Check if PyTorch 2.7.0a0+ for RTX 5090 support
    version_parts = pytorch_version.split('.')
    major = int(version_parts[0])
    minor = int(version_parts[1])
    
    if major < 2 or (major == 2 and minor < 7):
        print("❌ PyTorch version too old for RTX 5090 (need 2.7.0a0+)")
        return False
    else:
        print("✅ PyTorch version compatible with RTX 5090")
    
    # Check CUDA availability
    if not torch.cuda.is_available():
        print("❌ CUDA not available")
        return False
    else:
        print("✅ CUDA available")
    
    # Check device count
    device_count = torch.cuda.device_count()
    print(f"GPU count: {device_count}")
    
    if device_count == 0:
        print("❌ No CUDA devices found")
        return False
    
    # Check device capability (RTX 5090 is sm_120)
    device_capability = torch.cuda.get_device_capability(0)
    print(f"CUDA capability: sm_{device_capability[0]}{device_capability[1]}")
    
    if device_capability != (12, 0):
        print(f"⚠️  Expected sm_120 for RTX 5090, got sm_{device_capability[0]}{device_capability[1]}")
        print("   This may still work but is not optimal")
    else:
        print("✅ RTX 5090 sm_120 architecture detected")
    
    # Check device name
    device_name = torch.cuda.get_device_name(0)
    print(f"GPU name: {device_name}")
    
    # Check memory
    memory_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"GPU memory: {memory_gb:.1f} GB")
    
    if "RTX 5090" in device_name:
        print("✅ RTX 5090 detected")
    else:
        print(f"⚠️  Expected RTX 5090, got {device_name}")
    
    # Test basic tensor operations
    try:
        x = torch.randn(1000, 1000, device='cuda')
        y = torch.matmul(x, x.T)
        print("✅ Basic CUDA operations working")
    except Exception as e:
        print(f"❌ CUDA operation failed: {e}")
        return False
    
    print("\n🎯 RTX 5090 Compatibility Summary:")
    print("="*40)
    
    if device_capability == (12, 0) and "RTX 5090" in device_name:
        print("✅ OPTIMAL: RTX 5090 with sm_120 support detected")
        print("✅ Ready for high-performance training")
        return True
    else:
        print("⚠️  SUBOPTIMAL: Not an RTX 5090 or compatibility issues")
        print("   Training may work but performance will be reduced")
        return True  # Still allow training

if __name__ == "__main__":
    success = verify_rtx5090_compatibility()
    sys.exit(0 if success else 1)