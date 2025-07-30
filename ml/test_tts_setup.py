#!/usr/bin/env python3
"""
Test script to verify TTS setup with RTX 5090
"""

import os
import sys
import torch
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_pytorch_cuda():
    """Test PyTorch and CUDA setup."""
    logger.info("=== Testing PyTorch and CUDA ===")
    
    logger.info(f"PyTorch version: {torch.__version__}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        logger.info(f"CUDA version: {torch.version.cuda}")
        logger.info(f"GPU count: {torch.cuda.device_count()}")
        
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            logger.info(f"GPU {i}: {props.name}")
            logger.info(f"  Memory: {props.total_memory / 1e9:.1f} GB")
            logger.info(f"  Compute capability: {props.major}.{props.minor}")
        
        # Test GPU memory allocation
        try:
            x = torch.randn(1000, 1000, device='cuda')
            logger.info(f"✓ GPU tensor allocation successful")
            logger.info(f"Memory allocated: {torch.cuda.memory_allocated() / 1e6:.1f} MB")
            del x
            torch.cuda.empty_cache()
        except Exception as e:
            logger.error(f"✗ GPU tensor allocation failed: {e}")
            return False
    else:
        logger.warning("CUDA not available")
        return False
    
    return True

def test_torchaudio():
    """Test torchaudio import."""
    logger.info("=== Testing torchaudio ===")
    
    try:
        import torchaudio
        logger.info(f"✓ torchaudio version: {torchaudio.__version__}")
        
        # Test basic functionality
        waveform = torch.randn(1, 16000)  # 1 second of audio at 16kHz
        sample_rate = 16000
        
        # Test resampling
        resampler = torchaudio.transforms.Resample(sample_rate, 22050)
        resampled = resampler(waveform)
        logger.info(f"✓ Resampling test passed: {waveform.shape} -> {resampled.shape}")
        
        return True
        
    except ImportError as e:
        logger.error(f"✗ torchaudio import failed: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ torchaudio test failed: {e}")
        return False

def test_audio_libraries():
    """Test audio processing libraries."""
    logger.info("=== Testing audio libraries ===")
    
    libraries = [
        ('soundfile', 'sf'),
        ('librosa', 'librosa'),
        ('resampy', 'resampy'),
        ('numpy', 'np')
    ]
    
    success = True
    for lib_name, import_name in libraries:
        try:
            if import_name == 'sf':
                import soundfile as sf
                logger.info(f"✓ {lib_name} version: {sf.__version__}")
            elif import_name == 'librosa':
                import librosa
                logger.info(f"✓ {lib_name} version: {librosa.__version__}")
            elif import_name == 'resampy':
                import resampy
                logger.info(f"✓ {lib_name} available")
            elif import_name == 'np':
                import numpy as np
                logger.info(f"✓ {lib_name} version: {np.__version__}")
        except ImportError as e:
            logger.error(f"✗ {lib_name} import failed: {e}")
            success = False
        except Exception as e:
            logger.error(f"✗ {lib_name} test failed: {e}")
            success = False
    
    return success

def test_tts():
    """Test TTS library."""
    logger.info("=== Testing TTS library ===")
    
    try:
        os.environ['COQUI_TOS_AGREED'] = '1'
        from TTS.api import TTS
        logger.info("✓ TTS library imported successfully")
        
        # Test model listing
        models = TTS.list_models()
        xtts_models = [m for m in models if 'xtts' in m.lower()]
        logger.info(f"✓ Found {len(xtts_models)} XTTS models")
        
        if xtts_models:
            logger.info(f"Available XTTS models: {xtts_models[:3]}...")  # Show first 3
        
        # Test basic TTS initialization (without loading full model)
        logger.info("Testing XTTS-v2 model availability...")
        try:
            # This will download if not available but won't load to GPU yet
            tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", 
                     gpu=False)  # Start with CPU to test availability
            logger.info("✓ XTTS-v2 model available")
            
            # Test GPU loading if CUDA available
            if torch.cuda.is_available():
                logger.info("Testing GPU loading...")
                tts.to('cuda')
                logger.info("✓ XTTS-v2 loaded on GPU successfully")
            
            return True
            
        except Exception as e:
            logger.error(f"✗ XTTS-v2 model test failed: {e}")
            return False
        
    except ImportError as e:
        logger.error(f"✗ TTS library import failed: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ TTS library test failed: {e}")
        return False

def main():
    """Run all tests."""
    logger.info("Starting TTS setup verification for RTX 5090...")
    
    tests = [
        ("PyTorch/CUDA", test_pytorch_cuda),
        ("torchaudio", test_torchaudio),
        ("Audio libraries", test_audio_libraries),
        ("TTS library", test_tts)
    ]
    
    results = {}
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            logger.error(f"Test {test_name} crashed: {e}")
            results[test_name] = False
    
    # Summary
    logger.info(f"\n{'='*50}")
    logger.info("=== TEST SUMMARY ===")
    all_passed = True
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        logger.info("\n🎉 All tests passed! Voice cloning should work properly.")
        return 0
    else:
        logger.error("\n❌ Some tests failed. Voice cloning may not work correctly.")
        return 1

if __name__ == "__main__":
    sys.exit(main())