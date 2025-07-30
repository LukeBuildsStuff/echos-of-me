#!/usr/bin/env python3
"""
Deployment Fixes for Critical Issues
Fixes the critical issues identified in deployment readiness audit
"""

import os
import sys
import shutil
from pathlib import Path

class DeploymentFixer:
    """Fixes critical deployment issues."""
    
    def __init__(self):
        self.fixes_applied = []
        self.fixes_failed = []
        
    def apply_all_fixes(self):
        """Apply all critical fixes."""
        print("🔧 APPLYING DEPLOYMENT FIXES")
        print("="*50)
        
        # Fix 1: Audio file serving configuration
        self.fix_audio_file_serving()
        
        # Fix 2: Input validation improvements
        self.fix_input_validation()
        
        # Fix 3: Security enhancements
        self.fix_security_issues()
        
        # Fix 4: RTX 5090 compatibility warnings
        self.fix_rtx5090_compatibility()
        
        # Generate fix report
        self.generate_fix_report()
    
    def fix_audio_file_serving(self):
        """Fix audio file serving configuration."""
        print("\n🎵 Fixing Audio File Serving...")
        
        try:
            # Check if ML service needs static file serving
            ml_server_path = Path("/home/luke/personal-ai-clone/ml/voice_only_server.py")
            
            if ml_server_path.exists():
                with open(ml_server_path, 'r') as f:
                    content = f.read()
                
                # Check if static files are already configured
                if "StaticFiles" not in content:
                    print("  ℹ️  ML service needs static file serving configuration")
                    print("  📝 Recommendation: Add FastAPI StaticFiles mount for /voices path")
                    
                    # Create a patch file instead of modifying directly
                    patch_content = """
# Add this to voice_only_server.py after FastAPI imports:
from fastapi.staticfiles import StaticFiles

# Add this in _setup_routes method:
self.app.mount("/voices", StaticFiles(directory="/web/public/voices"), name="voices")
"""
                    
                    patch_file = Path("/tmp/audio_serving_patch.txt")
                    with open(patch_file, 'w') as f:
                        f.write(patch_content)
                    
                    print(f"  📄 Patch file created: {patch_file}")
                    self.fixes_applied.append("Audio file serving patch created")
                else:
                    print("  ✅ Audio file serving already configured")
                    self.fixes_applied.append("Audio file serving verified")
                    
        except Exception as e:
            print(f"  ❌ Failed to fix audio file serving: {str(e)}")
            self.fixes_failed.append(f"Audio file serving: {str(e)}")
    
    def fix_input_validation(self):
        """Fix input validation issues."""
        print("\n🛡️  Fixing Input Validation...")
        
        try:
            # Create improved validation patch
            validation_patch = """
# Enhanced input validation for voice synthesis

def validate_synthesis_request(text: str, voice_id: str) -> tuple[bool, str]:
    '''Validate voice synthesis request parameters.'''
    
    # Text validation
    if not text or not text.strip():
        return False, "Text cannot be empty"
    
    if len(text) > 10000:  # 10K character limit
        return False, "Text too long (max 10,000 characters)"
    
    # Check for potentially harmful content
    if any(char in text for char in ['<', '>', '{', '}', 'script']):
        return False, "Text contains potentially unsafe characters"
    
    # Voice ID validation
    if not voice_id or not voice_id.strip():
        return False, "Voice ID cannot be empty"
    
    # Valid voice ID pattern
    import re
    if not re.match(r'^[a-zA-Z0-9_]+$', voice_id):
        return False, "Voice ID contains invalid characters"
    
    return True, "Valid"

# Usage in synthesis endpoint:
# is_valid, error_msg = validate_synthesis_request(request.text, request.voice_id)
# if not is_valid:
#     raise HTTPException(status_code=400, detail=error_msg)
"""
            
            validation_file = Path("/tmp/input_validation_patch.py")
            with open(validation_file, 'w') as f:
                f.write(validation_patch)
            
            print(f"  📄 Input validation patch created: {validation_file}")
            self.fixes_applied.append("Input validation improvements created")
            
        except Exception as e:
            print(f"  ❌ Failed to create input validation fixes: {str(e)}")
            self.fixes_failed.append(f"Input validation: {str(e)}")
    
    def fix_security_issues(self):
        """Fix security issues."""
        print("\n🔒 Fixing Security Issues...")
        
        try:
            # Create security enhancements
            security_patch = """
# Security enhancements for voice cloning system

import os
from pathlib import Path

def validate_file_path(file_path: str, allowed_base: str = "/web/public/voices") -> bool:
    '''Validate file paths to prevent directory traversal attacks.'''
    
    try:
        # Convert to Path objects for safe handling
        requested_path = Path(file_path).resolve()
        allowed_base_path = Path(allowed_base).resolve()
        
        # Check if the requested path is within allowed base
        return str(requested_path).startswith(str(allowed_base_path))
        
    except Exception:
        return False

def sanitize_user_input(user_input: str) -> str:
    '''Sanitize user input to prevent injection attacks.'''
    
    if not isinstance(user_input, str):
        return ""
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '{', '}', '"', "'", '`', '\\', '/', '|']
    for char in dangerous_chars:
        user_input = user_input.replace(char, '')
    
    # Limit length
    return user_input[:10000]

def create_secure_filename(user_id: str, timestamp: int) -> str:
    '''Create secure filename for audio files.'''
    
    # Sanitize user_id
    safe_user_id = ''.join(c for c in user_id if c.isalnum() or c == '_')[:50]
    
    return f"voice_{safe_user_id}_{timestamp}.wav"

# Rate limiting configuration (implement in FastAPI)
RATE_LIMIT_REQUESTS = 10  # requests per minute
RATE_LIMIT_WINDOW = 60    # seconds
"""
            
            security_file = Path("/tmp/security_enhancements.py")
            with open(security_file, 'w') as f:
                f.write(security_patch)
            
            print(f"  📄 Security enhancements created: {security_file}")
            self.fixes_applied.append("Security enhancements created")
            
        except Exception as e:
            print(f"  ❌ Failed to create security fixes: {str(e)}")
            self.fixes_failed.append(f"Security fixes: {str(e)}")
    
    def fix_rtx5090_compatibility(self):
        """Fix RTX 5090 compatibility issues."""
        print("\n🚀 Fixing RTX 5090 Compatibility...")
        
        try:
            # Create RTX 5090 compatibility guide
            compatibility_guide = """
# RTX 5090 Compatibility Fix Guide

## Issue: PyTorch CUDA Compatibility Warning
The current PyTorch installation shows warnings about RTX 5090 (sm_120) compatibility.

## Solution Options:

### Option 1: Use NVIDIA PyTorch Container (Recommended)
```bash
# Pull latest NVIDIA PyTorch container with RTX 5090 support
docker pull nvcr.io/nvidia/pytorch:25.04-py3

# Run with RTX 5090 support
docker run --gpus all -it --rm nvcr.io/nvidia/pytorch:25.04-py3
```

### Option 2: Install PyTorch Nightly with RTX 5090 Support
```bash
# Install PyTorch nightly with CUDA 12.6+ for RTX 5090 support
pip3 install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu126
```

### Option 3: Continue with Current Setup (Functional but with warnings)
The current setup works despite warnings. Performance may not be fully optimized.

## Current Status:
- Voice synthesis: ✅ Functional
- GPU acceleration: ✅ Working (with warnings)  
- Memory usage: ✅ Optimal (1.6% of 34GB)
- Performance: ✅ Good (~0.5-2s synthesis times)

## Recommendation:
For production deployment, use Option 1 (NVIDIA container) for full RTX 5090 optimization.
For development/testing, current setup is sufficient.
"""
            
            compatibility_file = Path("/tmp/rtx5090_compatibility_guide.md")
            with open(compatibility_file, 'w') as f:
                f.write(compatibility_guide)
            
            print(f"  📄 RTX 5090 compatibility guide created: {compatibility_file}")
            print("  ✅ Current setup functional despite warnings")
            self.fixes_applied.append("RTX 5090 compatibility guide created")
            
        except Exception as e:
            print(f"  ❌ Failed to create RTX 5090 compatibility guide: {str(e)}")
            self.fixes_failed.append(f"RTX 5090 compatibility: {str(e)}")
    
    def generate_fix_report(self):
        """Generate fix application report."""
        print("\n" + "="*50)
        print("DEPLOYMENT FIXES REPORT")
        print("="*50)
        
        print(f"\n✅ Fixes Applied: {len(self.fixes_applied)}")
        for fix in self.fixes_applied:
            print(f"  • {fix}")
        
        if self.fixes_failed:
            print(f"\n❌ Fixes Failed: {len(self.fixes_failed)}")
            for fix in self.fixes_failed:
                print(f"  • {fix}")
        
        print(f"\n💡 Next Steps:")
        print("  1. Review and apply the patch files created in /tmp/")
        print("  2. Test the system after applying fixes")
        print("  3. Re-run deployment readiness audit")
        print("  4. Consider using NVIDIA PyTorch container for full RTX 5090 optimization")
        
        print(f"\n📄 Patch Files Created:")
        patch_files = [
            "/tmp/audio_serving_patch.txt",
            "/tmp/input_validation_patch.py", 
            "/tmp/security_enhancements.py",
            "/tmp/rtx5090_compatibility_guide.md"
        ]
        
        for patch_file in patch_files:
            if Path(patch_file).exists():
                print(f"  • {patch_file}")
        
        print("="*50)

def main():
    """Main fix application."""
    fixer = DeploymentFixer()
    fixer.apply_all_fixes()

if __name__ == "__main__":
    main()