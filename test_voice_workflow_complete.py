#!/usr/bin/env python3
"""
Complete Voice Workflow Testing
Tests the entire voice cloning pipeline from recording to playback
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import subprocess
from pathlib import Path
from datetime import datetime

class VoiceWorkflowTester:
    def __init__(self):
        self.ml_url = "http://localhost:8000"
        self.voice_files_dir = Path("/home/luke/personal-ai-clone/web/public/voices")
        self.synthesis_dir = Path("/home/luke/personal-ai-clone/web/public/voices/synthesis")
        self.test_results = []
        
    def run_complete_workflow_test(self):
        """Test the complete voice workflow."""
        print("🎤 Testing Complete Voice Cloning Workflow")
        print("=" * 50)
        
        # Test 1: Check existing voice profiles
        self.test_voice_profile_availability()
        
        # Test 2: Test voice synthesis quality
        self.test_voice_synthesis_quality()
        
        # Test 3: Test multiple synthesis requests
        self.test_multiple_synthesis_requests()
        
        # Test 4: Test error handling
        self.test_synthesis_error_handling()
        
        # Test 5: Test performance metrics
        self.test_synthesis_performance()
        
        # Test 6: Verify audio file integrity
        self.test_audio_file_integrity()
        
        # Generate final report
        self.generate_workflow_report()

    def test_voice_profile_availability(self):
        """Test voice profile availability and discovery."""
        print("\n📋 Test 1: Voice Profile Availability")
        try:
            # Get available profiles
            with urllib.request.urlopen(f"{self.ml_url}/voice/profiles", timeout=10) as response:
                profiles_data = json.loads(response.read().decode())
            
            profiles = profiles_data.get("profiles", [])
            default_profile = profiles_data.get("default")
            
            result = {
                "test": "voice_profile_availability",
                "status": "PASS" if len(profiles) > 0 else "FAIL",
                "profiles_found": len(profiles),
                "profiles": profiles,
                "default_profile": default_profile,
                "details": f"Found {len(profiles)} voice profiles"
            }
            
            self.test_results.append(result)
            
            print(f"  ✅ Found {len(profiles)} voice profiles")
            print(f"  🎯 Default profile: {default_profile}")
            for profile in profiles:
                print(f"    - {profile}")
                
        except Exception as e:
            result = {
                "test": "voice_profile_availability",
                "status": "ERROR",
                "error": str(e)
            }
            self.test_results.append(result)
            print(f"  ❌ Error: {str(e)}")

    def test_voice_synthesis_quality(self):
        """Test voice synthesis with various text types."""
        print("\n📋 Test 2: Voice Synthesis Quality")
        
        test_texts = [
            {
                "name": "Simple greeting",
                "text": "Hello, how are you today?"
            },
            {
                "name": "Emotional content",
                "text": "I love you so much, and I want you to remember that you are strong, capable, and deeply cherished."
            },
            {
                "name": "Complex sentence",
                "text": "Throughout my years, I've learned that happiness isn't found in the big moments alone, but in the small acts of love we share every day."
            },
            {
                "name": "Questions and dialogue",
                "text": "What's the most important thing I want you to remember? That family is everything, and love never dies."
            }
        ]
        
        for test_case in test_texts:
            try:
                print(f"  🔊 Testing: {test_case['name']}")
                
                # Prepare synthesis request
                payload = json.dumps({
                    "text": test_case["text"],
                    "voice_id": "voice_lukemoeller_yahoo_com_latest"
                }).encode()
                
                req = urllib.request.Request(
                    f"{self.ml_url}/voice/synthesize",
                    data=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                start_time = time.time()
                
                with urllib.request.urlopen(req, timeout=30) as response:
                    response_data = json.loads(response.read().decode())
                    synthesis_time = time.time() - start_time
                
                # Check if audio file was created
                audio_url = response_data.get("audio_url", "")
                audio_file = Path(f"/home/luke/personal-ai-clone/web/public{audio_url}")
                
                result = {
                    "test": "voice_synthesis_quality",
                    "subtest": test_case["name"],
                    "status": "PASS" if audio_file.exists() else "FAIL",
                    "synthesis_time": synthesis_time,
                    "generation_time": response_data.get("generation_time", 0),
                    "audio_url": audio_url,
                    "audio_file_exists": audio_file.exists(),
                    "audio_file_size": audio_file.stat().st_size if audio_file.exists() else 0,
                    "text_length": len(test_case["text"])
                }
                
                self.test_results.append(result)
                
                if audio_file.exists():
                    print(f"    ✅ Generated: {audio_file.name} ({result['audio_file_size']} bytes)")
                    print(f"    ⏱️  Synthesis time: {synthesis_time:.2f}s")
                else:
                    print(f"    ❌ Audio file not created")
                    
            except Exception as e:
                result = {
                    "test": "voice_synthesis_quality",
                    "subtest": test_case["name"],
                    "status": "ERROR",
                    "error": str(e)
                }
                self.test_results.append(result)
                print(f"    ❌ Error: {str(e)}")

    def test_multiple_synthesis_requests(self):
        """Test handling multiple synthesis requests."""
        print("\n📋 Test 3: Multiple Synthesis Requests")
        
        concurrent_requests = 3
        results = []
        
        for i in range(concurrent_requests):
            try:
                text = f"This is synthesis request number {i+1}. Testing concurrent voice generation capabilities."
                
                payload = json.dumps({
                    "text": text,
                    "voice_id": "voice_lukemoeller_yahoo_com_latest"
                }).encode()
                
                req = urllib.request.Request(
                    f"{self.ml_url}/voice/synthesize",
                    data=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                start_time = time.time()
                with urllib.request.urlopen(req, timeout=30) as response:
                    response_data = json.loads(response.read().decode())
                    request_time = time.time() - start_time
                
                results.append({
                    "request_id": i+1,
                    "success": True,
                    "request_time": request_time,
                    "generation_time": response_data.get("generation_time", 0),
                    "audio_url": response_data.get("audio_url", "")
                })
                
                print(f"  ✅ Request {i+1}: {request_time:.2f}s")
                
            except Exception as e:
                results.append({
                    "request_id": i+1,
                    "success": False,
                    "error": str(e)
                })
                print(f"  ❌ Request {i+1}: {str(e)}")
        
        successful_requests = sum(1 for r in results if r.get("success", False))
        
        result = {
            "test": "multiple_synthesis_requests",
            "status": "PASS" if successful_requests == concurrent_requests else "PARTIAL",
            "total_requests": concurrent_requests,
            "successful_requests": successful_requests,
            "results": results,
            "average_time": sum(r.get("request_time", 0) for r in results if r.get("success")) / max(1, successful_requests)
        }
        
        self.test_results.append(result)
        
        print(f"  📊 Summary: {successful_requests}/{concurrent_requests} successful")
        print(f"  ⏱️  Average time: {result['average_time']:.2f}s")

    def test_synthesis_error_handling(self):
        """Test error handling in synthesis."""
        print("\n📋 Test 4: Error Handling")
        
        error_tests = [
            {
                "name": "Empty text",
                "payload": {"text": "", "voice_id": "voice_lukemoeller_yahoo_com_latest"},
                "expected_status": [400, 422]
            },
            {
                "name": "Invalid voice ID",
                "payload": {"text": "Test text", "voice_id": "nonexistent_voice"},
                "expected_status": [404]
            },
            {
                "name": "Very long text",
                "payload": {"text": "A" * 10000, "voice_id": "voice_lukemoeller_yahoo_com_latest"},
                "expected_status": [200, 400, 413]  # Might succeed or fail gracefully
            }
        ]
        
        for test_case in error_tests:
            try:
                print(f"  🧪 Testing: {test_case['name']}")
                
                payload = json.dumps(test_case["payload"]).encode()
                req = urllib.request.Request(
                    f"{self.ml_url}/voice/synthesize",
                    data=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                try:
                    with urllib.request.urlopen(req, timeout=30) as response:
                        status_code = response.getcode()
                        response_data = json.loads(response.read().decode())
                        
                except urllib.error.HTTPError as e:
                    status_code = e.code
                    response_data = {"error": f"HTTP {e.code}"}
                
                expected = test_case["expected_status"]
                handled_correctly = status_code in expected
                
                result = {
                    "test": "synthesis_error_handling",
                    "subtest": test_case["name"],
                    "status": "PASS" if handled_correctly else "FAIL",
                    "status_code": status_code,
                    "expected_codes": expected,
                    "handled_correctly": handled_correctly
                }
                
                self.test_results.append(result)
                
                if handled_correctly:
                    print(f"    ✅ Handled correctly: HTTP {status_code}")
                else:
                    print(f"    ❌ Unexpected status: HTTP {status_code} (expected: {expected})")
                    
            except Exception as e:
                result = {
                    "test": "synthesis_error_handling",
                    "subtest": test_case["name"],
                    "status": "ERROR",
                    "error": str(e)
                }
                self.test_results.append(result)
                print(f"    ❌ Error: {str(e)}")

    def test_synthesis_performance(self):
        """Test synthesis performance metrics."""
        print("\n📋 Test 5: Performance Metrics")
        
        try:
            # Get system status
            with urllib.request.urlopen(f"{self.ml_url}/voice/status", timeout=10) as response:
                status_data = json.loads(response.read().decode())
            
            # Test synthesis performance with medium text
            test_text = "Performance testing text. " * 10  # Repeat for consistent length
            
            payload = json.dumps({
                "text": test_text,
                "voice_id": "voice_lukemoeller_yahoo_com_latest"
            }).encode()
            
            req = urllib.request.Request(
                f"{self.ml_url}/voice/synthesize",
                data=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            start_time = time.time()
            
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = json.loads(response.read().decode())
                total_time = time.time() - start_time
            
            # Calculate performance metrics
            text_length = len(test_text)
            generation_time = response_data.get("generation_time", 0)
            characters_per_second = text_length / generation_time if generation_time > 0 else 0
            
            result = {
                "test": "synthesis_performance",
                "status": "PASS",
                "system_status": status_data,
                "text_length": text_length,
                "total_request_time": total_time,
                "generation_time": generation_time,
                "characters_per_second": characters_per_second,
                "gpu_memory_allocated": status_data.get("memory_usage", {}).get("allocated_gb", 0),
                "gpu_memory_reserved": status_data.get("memory_usage", {}).get("reserved_gb", 0)
            }
            
            self.test_results.append(result)
            
            print(f"  📊 Performance Metrics:")
            print(f"    Text length: {text_length} characters")
            print(f"    Generation time: {generation_time:.2f}s")
            print(f"    Speed: {characters_per_second:.1f} chars/sec")
            print(f"    GPU memory: {result['gpu_memory_allocated']:.2f}GB allocated")
            print(f"    Total request time: {total_time:.2f}s")
            
        except Exception as e:
            result = {
                "test": "synthesis_performance",
                "status": "ERROR",
                "error": str(e)
            }
            self.test_results.append(result)
            print(f"  ❌ Error: {str(e)}")

    def test_audio_file_integrity(self):
        """Test integrity of generated audio files."""
        print("\n📋 Test 6: Audio File Integrity")
        
        try:
            # Get recent synthesis files
            synthesis_files = list(self.synthesis_dir.glob("synthesis_*.wav"))
            synthesis_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            
            recent_files = synthesis_files[:5]  # Check last 5 files
            
            integrity_results = []
            
            for audio_file in recent_files:
                try:
                    file_size = audio_file.stat().st_size
                    created_time = audio_file.stat().st_ctime
                    
                    # Basic integrity checks
                    is_reasonable_size = 10000 < file_size < 10000000  # 10KB to 10MB
                    has_wav_extension = audio_file.suffix.lower() == '.wav'
                    
                    # Check if file is readable
                    with open(audio_file, 'rb') as f:
                        header = f.read(44)  # WAV header is typically 44 bytes
                        has_wav_header = header.startswith(b'RIFF') and b'WAVE' in header
                    
                    integrity_results.append({
                        "filename": audio_file.name,
                        "size_bytes": file_size,
                        "size_ok": is_reasonable_size,
                        "has_wav_extension": has_wav_extension,
                        "has_wav_header": has_wav_header,
                        "is_valid": is_reasonable_size and has_wav_extension and has_wav_header,
                        "created": datetime.fromtimestamp(created_time).isoformat()
                    })
                    
                except Exception as e:
                    integrity_results.append({
                        "filename": audio_file.name,
                        "error": str(e),
                        "is_valid": False
                    })
            
            valid_files = sum(1 for r in integrity_results if r.get("is_valid", False))
            
            result = {
                "test": "audio_file_integrity",
                "status": "PASS" if valid_files == len(integrity_results) else "PARTIAL",
                "files_checked": len(integrity_results),
                "valid_files": valid_files,
                "integrity_results": integrity_results
            }
            
            self.test_results.append(result)
            
            print(f"  📁 Checked {len(integrity_results)} recent audio files")
            print(f"  ✅ Valid files: {valid_files}/{len(integrity_results)}")
            
            for file_result in integrity_results:
                status = "✅" if file_result.get("is_valid", False) else "❌"
                size = file_result.get("size_bytes", 0)
                print(f"    {status} {file_result['filename']} ({size:,} bytes)")
                
        except Exception as e:
            result = {
                "test": "audio_file_integrity",
                "status": "ERROR",
                "error": str(e)
            }
            self.test_results.append(result)
            print(f"  ❌ Error: {str(e)}")

    def generate_workflow_report(self):
        """Generate comprehensive workflow test report."""
        print("\n" + "="*60)
        print("VOICE WORKFLOW TEST REPORT")
        print("="*60)
        
        # Count test results
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r.get("status") == "PASS")
        failed_tests = sum(1 for r in self.test_results if r.get("status") == "FAIL")
        error_tests = sum(1 for r in self.test_results if r.get("status") == "ERROR")
        partial_tests = sum(1 for r in self.test_results if r.get("status") == "PARTIAL")
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Errors: {error_tests} 🚫")
        print(f"Partial: {partial_tests} ⚠️")
        
        # Overall status
        workflow_ready = (failed_tests == 0 and error_tests == 0)
        print(f"\nVoice Workflow Status: {'READY' if workflow_ready else 'NEEDS ATTENTION'}")
        
        # Performance summary
        synthesis_tests = [r for r in self.test_results if "synthesis" in r.get("test", "")]
        if synthesis_tests:
            avg_generation_time = sum(r.get("generation_time", 0) for r in synthesis_tests if r.get("generation_time")) / len([r for r in synthesis_tests if r.get("generation_time")])
            print(f"Average Synthesis Time: {avg_generation_time:.2f}s")
        
        # Save detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "errors": error_tests,
                "partial": partial_tests,
                "workflow_ready": workflow_ready
            },
            "test_results": self.test_results
        }
        
        report_file = Path("/tmp/voice_workflow_test_report.json")
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        print("="*60)

def main():
    """Main test execution."""
    tester = VoiceWorkflowTester()
    tester.run_complete_workflow_test()

if __name__ == "__main__":
    main()