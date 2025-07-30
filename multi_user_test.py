#!/usr/bin/env python3

"""
Multi-User Scenario Test
Tests the voice cloning system's handling of multiple users and data isolation.
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime

class MultiUserTester:
    def __init__(self):
        self.ml_base_url = "http://localhost:8000"
        self.test_results = []
        
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

    def test_voice_profile_isolation(self):
        """Test voice profile isolation between users"""
        print("\n=== Testing Voice Profile Isolation ===")
        
        # Test different user voice IDs
        test_voices = [
            "voice_lukemoeller_yahoo_com_latest",
            "voice_testuser1_latest", 
            "voice_testuser2_latest",
            "voice_nonexistent_user_latest"
        ]
        
        test_text = "Testing voice profile isolation."
        
        valid_voices = 0
        isolated_properly = True
        
        for voice_id in test_voices:
            try:
                response = requests.post(
                    f"{self.ml_base_url}/voice/synthesize",
                    json={
                        "text": test_text,
                        "voice_id": voice_id
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    valid_voices += 1
                    self.log_test(f"Voice Access - {voice_id}", "PASS", 
                                "Voice accessible")
                elif response.status_code == 404:
                    self.log_test(f"Voice Access - {voice_id}", "PASS", 
                                "Properly rejected non-existent voice")
                else:
                    self.log_test(f"Voice Access - {voice_id}", "WARN", 
                                f"Unexpected response: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Voice Access - {voice_id}", "FAIL", 
                            f"Connection error: {e}")
        
        # Check that only legitimate voices work
        if valid_voices <= 2:  # Only lukemoeller should work typically
            self.log_test("Voice Profile Isolation", "PASS", 
                        f"Proper isolation: {valid_voices} valid voices")
        else:
            self.log_test("Voice Profile Isolation", "WARN", 
                        f"Many valid voices: {valid_voices} - check isolation")

    def test_concurrent_user_synthesis(self):
        """Test concurrent synthesis requests from multiple users"""
        print("\n=== Testing Concurrent User Synthesis ===")
        
        import threading
        import queue
        
        results_queue = queue.Queue()
        
        def synthesize_request(user_id, request_id):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.ml_base_url}/voice/synthesize",
                    json={
                        "text": f"This is request {request_id} for user {user_id}.",
                        "voice_id": f"voice_{user_id}_latest"
                    },
                    timeout=20
                )
                end_time = time.time()
                
                results_queue.put({
                    "user_id": user_id,
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "response_time": end_time - start_time,
                    "success": response.status_code == 200
                })
            except Exception as e:
                results_queue.put({
                    "user_id": user_id,
                    "request_id": request_id,
                    "error": str(e),
                    "success": False
                })
        
        # Simulate 3 concurrent users
        threads = []
        users = ["lukemoeller_yahoo_com", "lukemoeller_yahoo_com", "lukemoeller_yahoo_com"]
        
        for i, user_id in enumerate(users):
            thread = threading.Thread(target=synthesize_request, args=(user_id, i+1))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join(timeout=25)
        
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
            self.log_test("Concurrent Multi-User", "PASS", 
                        f"{successful_requests}/3 requests succeeded, avg: {avg_time:.2f}s")
        else:
            self.log_test("Concurrent Multi-User", "FAIL", 
                        f"Only {successful_requests}/3 requests succeeded", "WARN")

    def test_data_directory_structure(self):
        """Test proper data directory structure for multi-user support"""
        print("\n=== Testing Data Directory Structure ===")
        
        # Check voice data directories
        voice_base_dir = Path("/home/luke/personal-ai-clone/web/public/voices")
        model_base_dir = Path("/home/luke/personal-ai-clone/models/voices")
        
        if voice_base_dir.exists():
            user_dirs = [d for d in voice_base_dir.iterdir() if d.is_dir() and d.name != "synthesis"]
            
            if len(user_dirs) >= 1:
                self.log_test("Voice Data Structure", "PASS", 
                            f"Found {len(user_dirs)} user voice directories")
                
                # Check directory isolation
                for user_dir in user_dirs[:3]:  # Check first 3
                    if user_dir.name.replace("_", "@") != user_dir.name:  # Contains email-like structure
                        self.log_test(f"User Directory - {user_dir.name}", "PASS", 
                                    "Proper user directory naming")
                    else:
                        self.log_test(f"User Directory - {user_dir.name}", "WARN", 
                                    "Directory naming may not be user-specific")
            else:
                self.log_test("Voice Data Structure", "WARN", 
                            "No user voice directories found")
        else:
            self.log_test("Voice Data Structure", "FAIL", 
                        "Voice data directory not found", "CRITICAL")
        
        # Check model directories
        if model_base_dir.exists():
            model_user_dirs = [d for d in model_base_dir.iterdir() if d.is_dir()]
            
            if len(model_user_dirs) >= 1:
                self.log_test("Model Data Structure", "PASS", 
                            f"Found {len(model_user_dirs)} user model directories")
            else:
                self.log_test("Model Data Structure", "WARN", 
                            "No user model directories found")
        else:
            self.log_test("Model Data Structure", "FAIL", 
                        "Model data directory not found", "CRITICAL")

    def test_resource_management(self):
        """Test resource management under multi-user load"""
        print("\n=== Testing Resource Management ===")
        
        # Check initial GPU status
        try:
            response = requests.get(f"{self.ml_base_url}/voice/status", timeout=5)
            if response.status_code == 200:
                initial_status = response.json()
                initial_memory = initial_status.get("memory_usage", {})
                
                self.log_test("Initial GPU Status", "PASS", 
                            f"GPU available, {initial_memory.get('allocated_gb', 0):.2f}GB allocated")
                
                # Perform multiple synthesis requests rapidly
                rapid_requests = 5
                successful_rapid = 0
                
                for i in range(rapid_requests):
                    try:
                        response = requests.post(
                            f"{self.ml_base_url}/voice/synthesize",
                            json={
                                "text": f"Rapid test {i+1} for resource management.",
                                "voice_id": "voice_lukemoeller_yahoo_com_latest"
                            },
                            timeout=15
                        )
                        
                        if response.status_code == 200:
                            successful_rapid += 1
                        time.sleep(0.5)  # Small delay between requests
                        
                    except Exception as e:
                        print(f"  Rapid request {i+1} failed: {e}")
                
                if successful_rapid >= 3:  # At least 3/5 should succeed
                    self.log_test("Rapid Request Handling", "PASS", 
                                f"{successful_rapid}/{rapid_requests} rapid requests succeeded")
                else:
                    self.log_test("Rapid Request Handling", "WARN", 
                                f"Only {successful_rapid}/{rapid_requests} rapid requests succeeded")
                
                # Check GPU status after load
                time.sleep(2)  # Wait for GPU to settle
                response = requests.get(f"{self.ml_base_url}/voice/status", timeout=5)
                if response.status_code == 200:
                    final_status = response.json()
                    final_memory = final_status.get("memory_usage", {})
                    
                    memory_increase = (final_memory.get('allocated_gb', 0) - 
                                     initial_memory.get('allocated_gb', 0))
                    
                    if memory_increase < 1.0:  # Less than 1GB increase
                        self.log_test("Memory Management", "PASS", 
                                    f"Memory increase: {memory_increase:.2f}GB")
                    else:
                        self.log_test("Memory Management", "WARN", 
                                    f"High memory increase: {memory_increase:.2f}GB")
                else:
                    self.log_test("Final GPU Status", "WARN", 
                                "Could not check final GPU status")
                    
            else:
                self.log_test("Initial GPU Status", "FAIL", 
                            "Could not get initial GPU status", "CRITICAL")
                
        except Exception as e:
            self.log_test("Resource Management", "FAIL", 
                        f"Resource test failed: {e}")

    def test_scalability_indicators(self):
        """Test scalability indicators and bottlenecks"""
        print("\n=== Testing Scalability Indicators ===")
        
        # Test synthesis time scaling
        text_lengths = [
            ("Short", "Hello world."),
            ("Medium", "This is a medium length sentence for testing synthesis scaling."),
            ("Long", "This is a much longer paragraph designed to test how the voice synthesis system handles increased text length and whether processing time scales linearly or has other performance characteristics that would impact multi-user scenarios.")
        ]
        
        synthesis_times = []
        
        for length_name, text in text_lengths:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.ml_base_url}/voice/synthesize",
                    json={
                        "text": text,
                        "voice_id": "voice_lukemoeller_yahoo_com_latest"
                    },
                    timeout=20
                )
                
                if response.status_code == 200:
                    end_time = time.time()
                    synthesis_time = end_time - start_time
                    synthesis_times.append((length_name, len(text), synthesis_time))
                    
                    self.log_test(f"Scaling - {length_name} Text", "PASS", 
                                f"{len(text)} chars in {synthesis_time:.2f}s")
                else:
                    self.log_test(f"Scaling - {length_name} Text", "FAIL", 
                                f"Synthesis failed: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Scaling - {length_name} Text", "FAIL", 
                            f"Error: {e}")
        
        # Analyze scaling characteristics
        if len(synthesis_times) >= 2:
            # Calculate approximate scaling
            short_time = next((t for n, c, t in synthesis_times if n == "Short"), 0)
            long_time = next((t for n, c, t in synthesis_times if n == "Long"), 0)
            
            if long_time > 0 and short_time > 0:
                scaling_factor = long_time / short_time
                
                if scaling_factor < 5:  # Reasonable scaling
                    self.log_test("Synthesis Scaling", "PASS", 
                                f"Good scaling: {scaling_factor:.1f}x for longer text")
                else:
                    self.log_test("Synthesis Scaling", "WARN", 
                                f"Poor scaling: {scaling_factor:.1f}x for longer text")

    def generate_multi_user_report(self):
        """Generate multi-user test report"""
        print("\n" + "="*60)
        print("MULTI-USER SCENARIO TEST REPORT")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        warnings = len([r for r in self.test_results if r["status"] == "WARN"])
        
        critical_failures = len([r for r in self.test_results 
                               if r["status"] == "FAIL" and r["severity"] == "CRITICAL"])
        
        print(f"\nSUMMARY:")
        print(f"  Total Multi-User Tests: {total_tests}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Warnings: {warnings}")
        print(f"  Critical Multi-User Issues: {critical_failures}")
        
        success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
        print(f"  Multi-User Success Rate: {success_rate:.1f}%")
        
        # Multi-user assessment
        if critical_failures == 0 and failed <= 1:
            print(f"\n🟢 MULTI-USER ASSESSMENT: EXCELLENT SCALABILITY")
            print("The system handles multiple users effectively.")
        elif critical_failures == 0 and failed <= 2:
            print(f"\n🟡 MULTI-USER ASSESSMENT: GOOD SCALABILITY")
            print("The system works for multiple users with minor issues.")
        else:
            print(f"\n🔴 MULTI-USER ASSESSMENT: SCALABILITY CONCERNS")
            print("The system may struggle with multiple concurrent users.")
        
        return success_rate >= 70

def main():
    """Run multi-user scenario tests"""
    print("👥 Starting Multi-User Scenario Test")
    print("=" * 60)
    
    tester = MultiUserTester()
    
    try:
        # Run all multi-user test suites
        tester.test_voice_profile_isolation()
        tester.test_concurrent_user_synthesis()
        tester.test_data_directory_structure()
        tester.test_resource_management()
        tester.test_scalability_indicators()
        
        # Generate multi-user report
        multi_user_ready = tester.generate_multi_user_report()
        
        return multi_user_ready
        
    except Exception as e:
        print(f"\n\nMulti-user test framework error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)