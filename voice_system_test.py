#!/usr/bin/env python3

"""
Comprehensive Voice Cloning System Test
Tests the complete end-to-end voice cloning workflow for functional correctness.
"""

import requests
import json
import time
import os
import sys
from datetime import datetime
from pathlib import Path

class VoiceSystemTester:
    def __init__(self):
        self.web_base_url = "http://localhost:3001"
        self.ml_base_url = "http://localhost:8000"
        self.test_results = []
        self.session_cookie = None
        
    def log_test(self, test_name, status, details=None, severity="INFO"):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "severity": severity,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        # Color coding for console output
        colors = {
            "PASS": "\033[92m",  # Green
            "FAIL": "\033[91m",  # Red  
            "WARN": "\033[93m",  # Yellow
            "INFO": "\033[94m",  # Blue
            "CRITICAL": "\033[95m"  # Magenta
        }
        color = colors.get(severity, colors["INFO"])
        reset = "\033[0m"
        
        print(f"{color}[{severity}] {test_name}: {status}{reset}")
        if details:
            print(f"  Details: {details}")
    
    def test_infrastructure_connectivity(self):
        """Test 1: Infrastructure and Service Connectivity"""
        print("\n=== TEST 1: Infrastructure and Service Connectivity ===")
        
        # Test web application
        try:
            response = requests.get(f"{self.web_base_url}", timeout=10)
            if response.status_code == 200 and "Echos Of Me" in response.text:
                self.log_test("Web Application", "PASS", "Application accessible and loading")
            else:
                self.log_test("Web Application", "FAIL", f"Unexpected response: {response.status_code}", "CRITICAL")
        except Exception as e:
            self.log_test("Web Application", "FAIL", f"Connection failed: {e}", "CRITICAL")
        
        # Test ML inference service
        try:
            response = requests.get(f"{self.ml_base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("ML Inference Service", "PASS", f"GPU: {data.get('gpu', 'unknown')}")
                else:
                    self.log_test("ML Inference Service", "WARN", f"Service unhealthy: {data}")
            else:
                self.log_test("ML Inference Service", "FAIL", f"Health check failed: {response.status_code}", "CRITICAL")
        except Exception as e:
            self.log_test("ML Inference Service", "FAIL", f"Connection failed: {e}", "CRITICAL")
        
        # Test voice system status
        try:
            response = requests.get(f"{self.ml_base_url}/voice/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                tts_available = data.get("tts_available", False)
                gpu_available = data.get("gpu_available", False) 
                profiles_count = data.get("voice_profiles_count", 0)
                
                if tts_available and gpu_available:
                    self.log_test("Voice System Status", "PASS", 
                                f"TTS available, GPU ready, {profiles_count} voice profiles")
                else:
                    self.log_test("Voice System Status", "WARN", 
                                f"TTS: {tts_available}, GPU: {gpu_available}", "WARN")
            else:
                self.log_test("Voice System Status", "FAIL", 
                            f"Status check failed: {response.status_code}", "CRITICAL")
        except Exception as e:
            self.log_test("Voice System Status", "FAIL", f"Connection failed: {e}", "CRITICAL")
    
    def test_voice_data_existence(self):
        """Test 2: Voice Data and Model Existence"""
        print("\n=== TEST 2: Voice Data and Model Existence ===")
        
        # Test voice recordings
        voice_dir = Path("/home/luke/personal-ai-clone/web/public/voices/lukemoeller_yahoo_com")
        if voice_dir.exists():
            voice_files = list(voice_dir.glob("*.webm"))
            if len(voice_files) >= 4:
                self.log_test("Voice Recordings", "PASS", 
                            f"Found {len(voice_files)} voice files")
            else:
                self.log_test("Voice Recordings", "WARN", 
                            f"Only {len(voice_files)} voice files found, need 4 passages")
        else:
            self.log_test("Voice Recordings", "FAIL", 
                        "No voice directory found", "CRITICAL")
        
        # Test trained models
        model_dir = Path("/home/luke/personal-ai-clone/models/voices/lukemoeller_yahoo_com")
        if model_dir.exists():
            latest_link = model_dir / "latest"
            if latest_link.exists():
                self.log_test("Trained Voice Model", "PASS", 
                            "Latest voice model available")
            else:
                self.log_test("Trained Voice Model", "WARN", 
                            "No 'latest' model symlink found")
                
            # Check for timestamped models
            model_dirs = [d for d in model_dir.iterdir() if d.is_dir()]
            if model_dirs:
                self.log_test("Model Versions", "PASS", 
                            f"Found {len(model_dirs)} model versions")
            else:
                self.log_test("Model Versions", "FAIL", 
                            "No model versions found", "CRITICAL")
        else:
            self.log_test("Trained Voice Model", "FAIL", 
                        "No model directory found", "CRITICAL")
        
        # Test synthesis output directory
        synthesis_dir = Path("/home/luke/personal-ai-clone/web/public/voices/synthesis")
        if synthesis_dir.exists():
            synthesis_files = list(synthesis_dir.glob("*.wav"))
            if synthesis_files:
                self.log_test("Voice Synthesis Files", "PASS", 
                            f"Found {len(synthesis_files)} synthesis samples")
            else:
                self.log_test("Voice Synthesis Files", "WARN", 
                            "No synthesis files found")
        else:
            self.log_test("Voice Synthesis Files", "WARN", 
                        "Synthesis directory not found")
    
    def test_api_endpoints(self):
        """Test 3: API Endpoint Connectivity and Security"""
        print("\n=== TEST 3: API Endpoint Connectivity and Security ===")
        
        # Test unauthorized access (should fail)
        endpoints_to_test = [
            "/api/voice/health",
            "/api/voice/upload",
            "/api/voice/train", 
            "/api/voice/synthesize"
        ]
        
        for endpoint in endpoints_to_test:
            try:
                response = requests.get(f"{self.web_base_url}{endpoint}", timeout=5)
                if response.status_code == 401:
                    self.log_test(f"Security Check {endpoint}", "PASS", 
                                "Properly requires authentication")
                else:
                    self.log_test(f"Security Check {endpoint}", "FAIL", 
                                f"Should return 401, got {response.status_code}", "CRITICAL")
            except Exception as e:
                self.log_test(f"Security Check {endpoint}", "FAIL", 
                            f"Connection failed: {e}", "CRITICAL")
    
    def test_ml_voice_synthesis(self):
        """Test 4: ML Voice Synthesis Capability"""
        print("\n=== TEST 4: ML Voice Synthesis Capability ===")
        
        test_text = "Hello, this is a test of the voice synthesis system."
        test_voice_id = "voice_lukemoeller_yahoo_com_latest"
        
        try:
            # Test direct ML service call
            response = requests.post(
                f"{self.ml_base_url}/voice/synthesize",
                json={
                    "text": test_text,
                    "voice_id": test_voice_id
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("audio_url"):
                    self.log_test("Direct ML Synthesis", "PASS", 
                                f"Generated audio in {data.get('generation_time', 'unknown')}s")
                    
                    # Test if audio file actually exists
                    audio_url = data["audio_url"]
                    if audio_url.startswith("/voices/synthesis/"):
                        audio_path = Path("/home/luke/personal-ai-clone/web/public" + audio_url)
                        if audio_path.exists():
                            self.log_test("Audio File Generation", "PASS", 
                                        f"Audio file created: {audio_path.name}")
                        else:
                            self.log_test("Audio File Generation", "FAIL", 
                                        f"Audio file not found: {audio_path}")
                    else:
                        self.log_test("Audio File Generation", "WARN", 
                                    f"Unexpected audio URL format: {audio_url}")
                else:
                    self.log_test("Direct ML Synthesis", "FAIL", 
                                "No audio URL in response")
            else:
                response_text = response.text[:200] if response.text else "No response body"
                self.log_test("Direct ML Synthesis", "FAIL", 
                            f"Status {response.status_code}: {response_text}", "CRITICAL")
                
        except Exception as e:
            self.log_test("Direct ML Synthesis", "FAIL", 
                        f"Synthesis failed: {e}", "CRITICAL")
    
    def test_voice_quality_assessment(self):
        """Test 5: Voice Quality Assessment"""
        print("\n=== TEST 5: Voice Quality Assessment ===")
        
        # Test different text types for quality
        test_cases = [
            ("Short phrase", "Hello world."),
            ("Medium sentence", "This is a medium length sentence to test voice quality."),
            ("Long paragraph", "This is a longer paragraph designed to test the voice synthesis system's ability to handle extended speech with natural intonation, proper pacing, and consistent quality throughout the entire passage."),
            ("Technical terms", "Voice synthesis utilizes neural networks for text-to-speech conversion."),
            ("Emotional content", "I'm so excited and happy to share this wonderful news with you!")
        ]
        
        for test_name, text in test_cases:
            try:
                response = requests.post(
                    f"{self.ml_base_url}/voice/synthesize",
                    json={
                        "text": text,
                        "voice_id": "voice_lukemoeller_yahoo_com_latest"
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    generation_time = data.get("generation_time", 0)
                    quality = data.get("quality", "unknown")
                    
                    if generation_time < 10:  # Should be reasonably fast
                        self.log_test(f"Quality Test: {test_name}", "PASS", 
                                    f"Generated in {generation_time}s, quality: {quality}")
                    else:
                        self.log_test(f"Quality Test: {test_name}", "WARN", 
                                    f"Slow generation: {generation_time}s")
                else:
                    self.log_test(f"Quality Test: {test_name}", "FAIL", 
                                f"Failed: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Quality Test: {test_name}", "FAIL", 
                            f"Error: {e}")
                
            # Small delay between tests
            time.sleep(1)
    
    def test_error_handling(self):
        """Test 6: Error Handling and Recovery"""
        print("\n=== TEST 6: Error Handling and Recovery ===")
        
        # Test invalid voice ID
        try:
            response = requests.post(
                f"{self.ml_base_url}/voice/synthesize", 
                json={
                    "text": "Test text",
                    "voice_id": "nonexistent_voice_id"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Invalid Voice ID Handling", "PASS", 
                            f"Properly rejected invalid voice ID: {response.status_code}")
            else:
                self.log_test("Invalid Voice ID Handling", "FAIL", 
                            "Should reject invalid voice ID")
        except Exception as e:
            self.log_test("Invalid Voice ID Handling", "WARN", 
                        f"Connection error during error test: {e}")
        
        # Test empty text
        try:
            response = requests.post(
                f"{self.ml_base_url}/voice/synthesize",
                json={
                    "text": "",
                    "voice_id": "voice_lukemoeller_yahoo_com_latest"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Empty Text Handling", "PASS", 
                            f"Properly rejected empty text: {response.status_code}")
            else:
                data = response.json()
                if not data.get("audio_url"):
                    self.log_test("Empty Text Handling", "PASS", 
                                "No audio generated for empty text")
                else:
                    self.log_test("Empty Text Handling", "WARN", 
                                "Generated audio for empty text")
        except Exception as e:
            self.log_test("Empty Text Handling", "WARN", 
                        f"Connection error during error test: {e}")
        
        # Test very long text
        long_text = "This is a very long text. " * 100  # 500+ words
        try:
            response = requests.post(
                f"{self.ml_base_url}/voice/synthesize",
                json={
                    "text": long_text,
                    "voice_id": "voice_lukemoeller_yahoo_com_latest"
                },
                timeout=45
            )
            
            if response.status_code == 200:
                data = response.json()
                generation_time = data.get("generation_time", 0)
                if generation_time < 30:  # Should handle long text reasonably
                    self.log_test("Long Text Handling", "PASS", 
                                f"Handled {len(long_text)} chars in {generation_time}s")
                else:
                    self.log_test("Long Text Handling", "WARN", 
                                f"Very slow for long text: {generation_time}s")
            else:
                self.log_test("Long Text Handling", "FAIL", 
                            f"Failed to process long text: {response.status_code}")
        except Exception as e:
            self.log_test("Long Text Handling", "FAIL", 
                        f"Long text processing failed: {e}")
    
    def test_performance_metrics(self):
        """Test 7: Performance and Resource Usage"""
        print("\n=== TEST 7: Performance and Resource Usage ===")
        
        # Test concurrent requests (simulated load test)
        import threading
        import queue
        
        results_queue = queue.Queue()
        test_text = "Performance test message for concurrent processing."
        
        def make_request():
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.ml_base_url}/voice/synthesize",
                    json={
                        "text": test_text,
                        "voice_id": "voice_lukemoeller_yahoo_com_latest"
                    },
                    timeout=20
                )
                end_time = time.time()
                
                results_queue.put({
                    "status_code": response.status_code,
                    "response_time": end_time - start_time,
                    "success": response.status_code == 200
                })
            except Exception as e:
                results_queue.put({
                    "error": str(e),
                    "success": False
                })
        
        # Create 3 concurrent requests
        threads = []
        for i in range(3):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join(timeout=30)
        
        # Collect results
        successful_requests = 0
        total_time = 0
        results = []
        
        while not results_queue.empty():
            result = results_queue.get()
            results.append(result)
            if result.get("success"):
                successful_requests += 1
                total_time += result.get("response_time", 0)
        
        if successful_requests >= 2:  # At least 2/3 should succeed
            avg_time = total_time / successful_requests if successful_requests > 0 else 0
            self.log_test("Concurrent Processing", "PASS", 
                        f"{successful_requests}/3 requests succeeded, avg: {avg_time:.2f}s")
        else:
            self.log_test("Concurrent Processing", "FAIL", 
                        f"Only {successful_requests}/3 requests succeeded", "WARN")
        
        # Check GPU memory usage
        try:
            response = requests.get(f"{self.ml_base_url}/voice/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                memory_info = data.get("memory_usage", {})
                allocated = memory_info.get("allocated_gb", 0)
                reserved = memory_info.get("reserved_gb", 0)
                
                if allocated < 2.0:  # Less than 2GB should be fine
                    self.log_test("GPU Memory Usage", "PASS", 
                                f"Allocated: {allocated:.2f}GB, Reserved: {reserved:.2f}GB")
                else:
                    self.log_test("GPU Memory Usage", "WARN", 
                                f"High memory usage: {allocated:.2f}GB allocated")
        except Exception as e:
            self.log_test("GPU Memory Usage", "WARN", 
                        f"Could not check memory: {e}")
    
    def generate_report(self):
        """Generate final test report"""
        print("\n" + "="*60)
        print("VOICE CLONING SYSTEM TEST REPORT")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        warnings = len([r for r in self.test_results if r["status"] == "WARN"])
        
        critical_failures = len([r for r in self.test_results 
                               if r["status"] == "FAIL" and r["severity"] == "CRITICAL"])
        
        print(f"\nSUMMARY:")
        print(f"  Total Tests: {total_tests}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Warnings: {warnings}")
        print(f"  Critical Failures: {critical_failures}")
        
        success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
        print(f"  Success Rate: {success_rate:.1f}%")
        
        # Overall system assessment
        if critical_failures == 0 and failed <= 2:
            print(f"\n🟢 OVERALL ASSESSMENT: SYSTEM READY FOR USE")
            print("The voice cloning system is functioning correctly.")
        elif critical_failures == 0 and failed <= 5:
            print(f"\n🟡 OVERALL ASSESSMENT: SYSTEM MOSTLY FUNCTIONAL")
            print("The system works but has some issues that should be addressed.")
        else:
            print(f"\n🔴 OVERALL ASSESSMENT: SYSTEM NEEDS ATTENTION")
            print("Critical issues found that may impact user experience.")
        
        # Detailed recommendations
        print(f"\nRECOMMENDAEINTIONS:")
        
        critical_issues = [r for r in self.test_results 
                          if r["status"] == "FAIL" and r["severity"] == "CRITICAL"]
        if critical_issues:
            print("⚠️  CRITICAL ISSUES TO FIX:")
            for issue in critical_issues:
                print(f"   - {issue['test']}: {issue['details']}")
        
        warnings_list = [r for r in self.test_results if r["status"] == "WARN"]
        if warnings_list:
            print("⚡ IMPROVEMENTS SUGGESTED:")
            for warning in warnings_list[:5]:  # Show top 5
                print(f"   - {warning['test']}: {warning['details']}")
        
        passes = [r for r in self.test_results if r["status"] == "PASS"]
        if passes:
            print("✅ WORKING CORRECTLY:")
            for passing in passes[:3]:  # Show top 3
                print(f"   - {passing['test']}")
        
        # Save detailed report
        report_file = f"/home/luke/personal-ai-clone/voice_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "summary": {
                    "total": total_tests,
                    "passed": passed,
                    "failed": failed,
                    "warnings": warnings,
                    "critical_failures": critical_failures,
                    "success_rate": success_rate
                },
                "test_results": self.test_results,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        return success_rate >= 70  # Return True if system is mostly functional

def main():
    """Run comprehensive voice system tests"""
    print("🎤 Starting Comprehensive Voice Cloning System Test")
    print("=" * 60)
    
    tester = VoiceSystemTester()
    
    try:
        # Run all test suites
        tester.test_infrastructure_connectivity()
        tester.test_voice_data_existence()
        tester.test_api_endpoints()
        tester.test_ml_voice_synthesis()
        tester.test_voice_quality_assessment()
        tester.test_error_handling()
        tester.test_performance_metrics()
        
        # Generate final report
        system_ready = tester.generate_report()
        
        # Exit with appropriate code
        sys.exit(0 if system_ready else 1)
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(2)
    except Exception as e:
        print(f"\n\nTest framework error: {e}")
        sys.exit(3)

if __name__ == "__main__":
    main()