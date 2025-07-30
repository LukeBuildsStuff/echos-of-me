#!/usr/bin/env python3
"""
Complete Voice Cloning Pipeline Test
Tests the end-to-end voice cloning workflow
"""

import requests
import json
import time
import os
from pathlib import Path

# Configuration
WEB_API_BASE = "http://localhost:3001/api"
ML_API_BASE = "http://localhost:8000"

def test_ml_service_health():
    """Test ML service health and voice system status."""
    print("🏥 Testing ML Service Health...")
    
    try:
        # Health check
        response = requests.get(f"{ML_API_BASE}/health")
        if response.status_code == 200:
            print("✅ ML service is healthy")
        else:
            print(f"❌ ML service health check failed: {response.status_code}")
            return False
        
        # Voice status check
        response = requests.get(f"{ML_API_BASE}/voice/status")
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Voice system status:")
            print(f"   - TTS Available: {status.get('tts_available')}")
            print(f"   - Model Loaded: {status.get('model_loaded')}")
            print(f"   - Device: {status.get('device')}")
            print(f"   - Voice Profiles: {status.get('voice_profiles_count')}")
            print(f"   - GPU Available: {status.get('gpu_available')}")
            
            if not status.get('tts_available'):
                print("❌ TTS system not available")
                return False
        else:
            print(f"❌ Voice status check failed: {response.status_code}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ ML service test failed: {e}")
        return False

def test_voice_profiles():
    """Test voice profile discovery and listing."""
    print("\n🎤 Testing Voice Profiles...")
    
    try:
        response = requests.get(f"{ML_API_BASE}/voice/profiles")
        if response.status_code == 200:
            profiles = response.json()
            print(f"✅ Found {profiles.get('count', 0)} voice profiles:")
            for profile in profiles.get('profiles', []):
                print(f"   - {profile}")
            
            if profiles.get('count', 0) == 0:
                print("⚠️  No voice profiles found - users need to record voice samples")
                return False
            
            return profiles.get('profiles', [])
        else:
            print(f"❌ Voice profiles check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Voice profiles test failed: {e}")
        return False

def test_voice_synthesis(voice_profiles):
    """Test voice synthesis functionality."""
    print("\n🔊 Testing Voice Synthesis...")
    
    if not voice_profiles:
        print("❌ No voice profiles to test synthesis")
        return False
    
    test_voice = voice_profiles[0]  # Use first available voice
    test_text = "Hello! This is a test of the voice synthesis system. How does my AI voice sound?"
    
    try:
        payload = {
            "text": test_text,
            "voice_id": test_voice
        }
        
        print(f"🎵 Testing synthesis with voice: {test_voice}")
        start_time = time.time()
        
        response = requests.post(
            f"{ML_API_BASE}/voice/synthesize",
            json=payload,
            timeout=30
        )
        
        synthesis_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Voice synthesis successful:")
            print(f"   - Audio URL: {result.get('audio_url')}")
            print(f"   - Duration: {result.get('duration'):.2f}s")
            print(f"   - Generation Time: {result.get('generation_time'):.2f}s")
            print(f"   - Total Time: {synthesis_time:.2f}s")
            
            # Check if audio file exists
            audio_path = result.get('audio_url', '').replace('/voices/', '/web/public/voices/')
            if audio_path and os.path.exists(audio_path):
                print(f"✅ Audio file created successfully")
            else:
                print(f"⚠️  Audio file not found at expected location")
            
            return True
        else:
            print(f"❌ Voice synthesis failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Voice synthesis test failed: {e}")
        return False

def test_voice_quality_metrics():
    """Test voice quality assessment and metrics."""
    print("\n📊 Testing Voice Quality Metrics...")
    
    try:
        response = requests.get(f"{ML_API_BASE}/debug")
        if response.status_code == 200:
            debug_info = response.json()
            print("✅ Voice system debug info:")
            print(f"   - Voice Cloner Available: {debug_info.get('voice_cloner_available')}")
            print(f"   - Has TTS: {debug_info.get('has_tts')}")
            print(f"   - Has Model: {debug_info.get('has_model')}")
            
            if 'profile_discovery' in debug_info:
                discovery = debug_info['profile_discovery']
                if discovery.get('success'):
                    print(f"   - Profile Discovery: ✅ {discovery.get('count', 0)} profiles")
                else:
                    print(f"   - Profile Discovery: ❌ Failed")
            
            return True
        else:
            print(f"❌ Debug info check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Voice quality metrics test failed: {e}")
        return False

def test_error_handling():
    """Test error handling and recovery."""
    print("\n🛠️  Testing Error Handling...")
    
    try:
        # Test with invalid voice ID
        payload = {
            "text": "Test with invalid voice",
            "voice_id": "nonexistent_voice_id"
        }
        
        response = requests.post(
            f"{ML_API_BASE}/voice/synthesize",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            result = response.json()
            print("✅ Error handling working correctly:")
            print(f"   - Status: {response.status_code}")
            print(f"   - Error: {result.get('detail', 'No detail provided')}")
            return True
        else:
            print("⚠️  Expected error but got success - error handling may need improvement")
            return False
            
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

def main():
    """Run complete voice cloning pipeline test."""
    print("🚀 Starting Complete Voice Cloning Pipeline Test")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 5
    
    # Run tests
    if test_ml_service_health():
        tests_passed += 1
    
    voice_profiles = test_voice_profiles()
    if voice_profiles:
        tests_passed += 1
    
    if voice_profiles and test_voice_synthesis(voice_profiles):
        tests_passed += 1
    
    if test_voice_quality_metrics():
        tests_passed += 1
    
    if test_error_handling():
        tests_passed += 1
    
    # Results
    print("\n" + "=" * 60)
    print(f"🏁 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("✅ All tests passed! Voice cloning pipeline is working correctly.")
        print("\n📋 Next Steps for Users:")
        print("   1. Record 4 diverse voice passages for optimal quality")
        print("   2. Test voice synthesis in AI Echo chat")
        print("   3. Provide feedback on voice quality")
        print("   4. Re-record passages if needed for improvements")
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        print("\n🔧 Common Solutions:")
        print("   - Ensure Docker containers are running")
        print("   - Check GPU availability and CUDA setup")
        print("   - Verify voice recordings exist in /web/public/voices/")
        print("   - Restart ML inference service if needed")
    
    return tests_passed == total_tests

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)