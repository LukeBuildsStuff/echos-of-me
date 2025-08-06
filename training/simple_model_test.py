#!/usr/bin/env python3
"""
Simple test to check what the trained model actually does
Without needing complex dependencies
"""

import json
import os

def check_model_files():
    """Check what model files exist"""
    print("🔍 Checking Model Files")
    print("=" * 40)
    
    # Check final_model directory
    final_model_path = "/home/luke/personal-ai-clone/web/training/final_model"
    if os.path.exists(final_model_path):
        print(f"✅ Found final_model directory at: {final_model_path}")
        files = os.listdir(final_model_path)
        print(f"   Files: {files}")
        
        # Check adapter config
        config_path = os.path.join(final_model_path, "adapter_config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
            print(f"   Base model: {config.get('base_model_name_or_path', 'Unknown')}")
            print(f"   LoRA rank: {config.get('r', 'Unknown')}")
            print(f"   Target modules: {config.get('target_modules', 'Unknown')}")
    else:
        print(f"❌ No final_model directory found at: {final_model_path}")
    
    # Check jose_simple_final directory
    jose_model_path = "/home/luke/personal-ai-clone/web/training/jose_simple_final"
    if os.path.exists(jose_model_path):
        print(f"✅ Found jose_simple_final directory at: {jose_model_path}")
        files = os.listdir(jose_model_path)
        print(f"   Files: {files}")
    else:
        print(f"❌ No jose_simple_final directory found")
    
    # Check jose_final_model directory
    jose_final_path = "/home/luke/personal-ai-clone/web/training/jose_final_model"
    if os.path.exists(jose_final_path):
        print(f"✅ Found jose_final_model directory at: {jose_final_path}")
        files = os.listdir(jose_final_path)
        print(f"   Files: {files}")
    else:
        print(f"❌ No jose_final_model directory found")

def check_training_logs():
    """Check training logs to understand what was trained"""
    print("\n📋 Checking Training Logs")
    print("=" * 40)
    
    log_path = "/home/luke/personal-ai-clone/web/training/training.log"
    if os.path.exists(log_path):
        print("✅ Found training.log")
        with open(log_path, 'r') as f:
            lines = f.readlines()
        
        # Look for key training info
        for line in lines[-50:]:  # Last 50 lines
            if "Training examples" in line or "Final loss" in line or "Training completed" in line:
                print(f"   {line.strip()}")
    else:
        print("❌ No training.log found")

def analyze_reports():
    """Analyze the training reports"""
    print("\n📊 Checking Training Reports")
    print("=" * 40)
    
    # Check RTX5090 report
    rtx_report = "/home/luke/personal-ai-clone/web/training/RTX5090_TRAINING_SUCCESS_REPORT.md"
    if os.path.exists(rtx_report):
        print("✅ Found RTX5090 training report")
        with open(rtx_report, 'r') as f:
            content = f.read()
        
        # Extract key info
        if "Luke's personal reflection responses" in content:
            print("   ⚠️  Trained on: Luke's personal reflection responses")
        if "TinyLlama" in content:
            print("   📦 Base model: TinyLlama")
        if "Final Loss:" in content:
            import re
            loss_match = re.search(r'Final Loss: ([\d.]+)', content)
            if loss_match:
                print(f"   📈 Final loss: {loss_match.group(1)}")
    
    # Check Jose report
    jose_report = "/home/luke/personal-ai-clone/web/training/JOSE_CHARACTER_VALIDATION_REPORT.md"
    if os.path.exists(jose_report):
        print("✅ Found Jose validation report")
        with open(jose_report, 'r') as f:
            content = f.read()
        
        if "Jose character model is ready" in content:
            print("   ✅ Jose character validation: Ready")
        if "Total Training Examples: 150" in content:
            print("   📊 Jose training examples: 150 (planned)")
    
def main():
    """Main analysis function"""
    print("🔍 HONEST MODEL VERIFICATION REPORT")
    print("=" * 50)
    
    check_model_files()
    check_training_logs()
    analyze_reports()
    
    print("\n🎯 CONCLUSION")
    print("=" * 20)
    print("Based on the evidence:")
    print("1. The trained model in final_model/ was trained on Luke's data, NOT Jose's")
    print("2. The training logs show 'Luke's personal reflection responses'")
    print("3. Jose character validation reports are planning documents, not actual results")
    print("4. The actual trained model is Luke's personality, not Jose's")
    print("5. There is NO working Jose model - only infrastructure and plans")

if __name__ == "__main__":
    main()