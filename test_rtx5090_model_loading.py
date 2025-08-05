#!/usr/bin/env python3
"""
RTX 5090 Model Loading Test
Tests PyTorch compatibility, GPU detection, and model loading for TinyLlama
"""

import torch
import sys
import os
from pathlib import Path

def test_rtx5090_compatibility():
    """Test RTX 5090 GPU compatibility and PyTorch version"""
    print("=== RTX 5090 Compatibility Test ===")
    
    # Check PyTorch version
    pytorch_version = torch.__version__
    print(f"PyTorch version: {pytorch_version}")
    
    # Check if CUDA is available
    cuda_available = torch.cuda.is_available()
    print(f"CUDA available: {cuda_available}")
    
    if not cuda_available:
        print("❌ CUDA not available - GPU acceleration disabled")
        return False
    
    # Check device count
    device_count = torch.cuda.device_count()
    print(f"CUDA devices: {device_count}")
    
    if device_count == 0:
        print("❌ No CUDA devices found")
        return False
    
    # Check GPU capability (RTX 5090 should be sm_120)
    try:
        capability = torch.cuda.get_device_capability(0)
        print(f"GPU capability: sm_{capability[0]}{capability[1]}")
        
        # RTX 5090 requires sm_120 (capability 12.0)
        if capability[0] >= 12:
            print("✅ RTX 5090 compatible architecture detected")
        elif capability[0] >= 9:
            print("⚠️  RTX 40xx/30xx series detected - some features may not work")
        else:
            print("❌ GPU architecture too old for modern PyTorch")
            return False
            
    except Exception as e:
        print(f"❌ Error checking GPU capability: {e}")
        return False
    
    # Check GPU memory
    try:
        memory_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"GPU Memory: {memory_total:.1f} GB")
        
        if memory_total > 20:
            print("✅ Sufficient GPU memory for model inference")
        else:
            print("⚠️  Limited GPU memory - may need optimization")
            
    except Exception as e:
        print(f"❌ Error checking GPU memory: {e}")
        return False
    
    return True

def test_ml_dependencies():
    """Test that required ML libraries are installed"""
    print("\n=== ML Dependencies Test ===")
    
    required_packages = [
        'transformers',
        'peft', 
        'bitsandbytes',
        'accelerate',
        'safetensors'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} installed")
        except ImportError:
            print(f"❌ {package} missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("Install with: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ All ML dependencies available")
    return True

def test_model_files():
    """Test that model files exist and are accessible"""
    print("\n=== Model Files Test ===")
    
    model_path = Path("/app/training/final_model")
    
    if not model_path.exists():
        print(f"❌ Model directory not found: {model_path}")
        return False
    
    required_files = [
        "adapter_config.json",
        "adapter_model.safetensors", 
        "tokenizer.json",
        "tokenizer_config.json"
    ]
    
    missing_files = []
    
    for file in required_files:
        file_path = model_path / file
        if file_path.exists():
            size_mb = file_path.stat().st_size / (1024**2)
            print(f"✅ {file} ({size_mb:.1f} MB)")
        else:
            print(f"❌ {file} missing")
            missing_files.append(file)
    
    if missing_files:
        print(f"\n❌ Missing model files: {', '.join(missing_files)}")
        return False
    
    print("✅ All model files present")
    return True

def test_model_loading():
    """Test loading the trained TinyLlama model"""
    print("\n=== Model Loading Test ===")
    
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        from peft import PeftModel
        
        model_path = "/app/training/final_model"
        base_model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        print("✅ Tokenizer loaded")
        
        print("Loading base model...")
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            torch_dtype=torch.float16,
            device_map="auto" if torch.cuda.is_available() else None,
            trust_remote_code=True
        )
        print("✅ Base model loaded")
        
        print("Loading PEFT adapter...")
        model = PeftModel.from_pretrained(base_model, model_path)
        print("✅ PEFT adapter loaded")
        
        # Test inference
        print("Testing inference...")
        test_prompt = "Hello, how are you today?"
        inputs = tokenizer(test_prompt, return_tensors="pt")
        
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
            model = model.cuda()
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=50,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"✅ Model inference successful")
        print(f"Input: {test_prompt}")
        print(f"Output: {response}")
        
        return True
        
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🚀 Starting RTX 5090 Model Loading Tests\n")
    
    tests = [
        ("RTX 5090 Compatibility", test_rtx5090_compatibility),
        ("ML Dependencies", test_ml_dependencies), 
        ("Model Files", test_model_files),
        ("Model Loading", test_model_loading)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
    
    print("\n=== Test Summary ===")
    all_passed = True
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All tests passed! RTX 5090 model loading ready.")
        return 0
    else:
        print("\n💥 Some tests failed. Check errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())