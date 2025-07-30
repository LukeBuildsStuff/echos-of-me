"""
RTX 5090 Inference Server Test Client
Tests the inference server functionality and RTX 5090 optimization
"""

import requests
import time
import json
from typing import Dict, Any, List

class InferenceTestClient:
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.test_results = []
    
    def test_health(self) -> Dict[str, Any]:
        """Test health endpoint."""
        print("🔍 Testing health endpoint...")
        try:
            response = requests.get(f"{self.server_url}/health", timeout=10)
            result = {
                "test": "health_check",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response": response.json() if response.status_code == 200 else response.text
            }
            print(f"Health Check: {'✅ PASS' if result['success'] else '❌ FAIL'}")
            return result
        except Exception as e:
            result = {
                "test": "health_check",
                "success": False,
                "error": str(e)
            }
            print(f"Health Check: ❌ FAIL - {e}")
            return result
    
    def test_status(self) -> Dict[str, Any]:
        """Test status endpoint."""
        print("📊 Testing status endpoint...")
        try:
            response = requests.get(f"{self.server_url}/status", timeout=15)
            result = {
                "test": "status_check",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response": response.json() if response.status_code == 200 else response.text
            }
            if result["success"]:
                status_data = result["response"]
                print(f"Status Check: ✅ PASS")
                print(f"  Model Loaded: {status_data.get('model_loaded', False)}")
                print(f"  Model Name: {status_data.get('model_name', 'Unknown')}")
                print(f"  Device: {status_data.get('device', 'Unknown')}")
                print(f"  GPU Memory: {status_data.get('memory_allocated_gb', 0):.2f}GB allocated")
            else:
                print(f"Status Check: ❌ FAIL")
            return result
        except Exception as e:
            result = {
                "test": "status_check",
                "success": False,
                "error": str(e)
            }
            print(f"Status Check: ❌ FAIL - {e}")
            return result
    
    def test_basic_inference(self) -> Dict[str, Any]:
        """Test basic chat inference."""
        print("💬 Testing basic inference...")
        try:
            payload = {
                "message": "Hello! Can you tell me a short story?",
                "user_context": "You are Luke, a helpful and wise person.",
                "max_length": 200,
                "temperature": 0.7,
                "top_p": 0.9
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.server_url}/chat",
                json=payload,
                timeout=30
            )
            end_time = time.time()
            
            result = {
                "test": "basic_inference",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": end_time - start_time
            }
            
            if result["success"]:
                data = response.json()
                result["response_data"] = data
                print(f"Basic Inference: ✅ PASS")
                print(f"  Response Time: {result['response_time']:.2f}s")
                print(f"  Generation Time: {data.get('generation_time', 0):.2f}s")
                print(f"  Confidence: {data.get('confidence', 0):.2f}")
                print(f"  Model Version: {data.get('model_version', 'Unknown')}")
                print(f"  Response: {data.get('response', '')[:150]}...")
            else:
                result["error"] = response.text
                print(f"Basic Inference: ❌ FAIL - HTTP {response.status_code}")
            
            return result
        except Exception as e:
            result = {
                "test": "basic_inference",
                "success": False,
                "error": str(e)
            }
            print(f"Basic Inference: ❌ FAIL - {e}")
            return result
    
    def test_context_inference(self) -> Dict[str, Any]:
        """Test inference with rich context."""
        print("🧠 Testing context-aware inference...")
        try:
            payload = {
                "message": "What advice would you give to someone starting their career?",
                "user_context": """You are Luke, a software engineer with 15 years of experience. 
                You've worked at both startups and large companies. You value work-life balance, 
                continuous learning, and helping others grow. You believe in the power of 
                persistence and finding meaning in your work.""",
                "max_length": 300,
                "temperature": 0.8,
                "top_p": 0.95
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.server_url}/chat",
                json=payload,
                timeout=45
            )
            end_time = time.time()
            
            result = {
                "test": "context_inference",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": end_time - start_time
            }
            
            if result["success"]:
                data = response.json()
                result["response_data"] = data
                print(f"Context Inference: ✅ PASS")
                print(f"  Response Time: {result['response_time']:.2f}s")
                print(f"  Generation Time: {data.get('generation_time', 0):.2f}s")
                print(f"  Confidence: {data.get('confidence', 0):.2f}")
                print(f"  Response: {data.get('response', '')[:200]}...")
            else:
                result["error"] = response.text
                print(f"Context Inference: ❌ FAIL - HTTP {response.status_code}")
            
            return result
        except Exception as e:
            result = {
                "test": "context_inference",
                "success": False,
                "error": str(e)
            }
            print(f"Context Inference: ❌ FAIL - {e}")
            return result
    
    def test_voice_synthesis(self) -> Dict[str, Any]:
        """Test voice synthesis integration."""
        print("🎤 Testing voice synthesis...")
        try:
            payload = {
                "message": "Hello, this is a test of voice synthesis.",
                "user_context": "You are Luke speaking warmly.",
                "max_length": 100,
                "temperature": 0.7,
                "voice_synthesis": True
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.server_url}/chat",
                json=payload,
                timeout=60
            )
            end_time = time.time()
            
            result = {
                "test": "voice_synthesis",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": end_time - start_time
            }
            
            if result["success"]:
                data = response.json()
                result["response_data"] = data
                has_audio = data.get("audio_url") is not None
                print(f"Voice Synthesis: {'✅ PASS' if has_audio else '⚠️ PARTIAL'}")
                print(f"  Response Time: {result['response_time']:.2f}s")
                print(f"  Audio Generated: {'Yes' if has_audio else 'No'}")
                if has_audio:
                    print(f"  Audio URL: {data.get('audio_url', 'None')}")
            else:
                result["error"] = response.text
                print(f"Voice Synthesis: ❌ FAIL - HTTP {response.status_code}")
            
            return result
        except Exception as e:
            result = {
                "test": "voice_synthesis",
                "success": False,
                "error": str(e)
            }
            print(f"Voice Synthesis: ❌ FAIL - {e}")
            return result
    
    def test_model_management(self) -> Dict[str, Any]:
        """Test model management endpoints."""
        print("🔧 Testing model management...")
        try:
            # Test available models
            response = requests.get(f"{self.server_url}/models/available", timeout=10)
            
            result = {
                "test": "model_management",
                "success": response.status_code == 200,
                "status_code": response.status_code
            }
            
            if result["success"]:
                data = response.json()
                result["available_models"] = data
                model_count = len(data.get("models", []))
                print(f"Model Management: ✅ PASS")
                print(f"  Available Models: {model_count}")
                for model in data.get("models", [])[:3]:  # Show first 3
                    print(f"    - {model}")
            else:
                result["error"] = response.text
                print(f"Model Management: ❌ FAIL - HTTP {response.status_code}")
            
            return result
        except Exception as e:
            result = {
                "test": "model_management",
                "success": False,
                "error": str(e)
            }
            print(f"Model Management: ❌ FAIL - {e}")
            return result
    
    def test_performance_stress(self, num_requests: int = 5) -> Dict[str, Any]:
        """Test performance under multiple requests."""
        print(f"⚡ Testing performance with {num_requests} concurrent requests...")
        
        import concurrent.futures
        import threading
        
        def single_request():
            payload = {
                "message": "Generate a creative response about the future of AI.",
                "max_length": 150,
                "temperature": 0.8
            }
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.server_url}/chat",
                    json=payload,
                    timeout=30
                )
                end_time = time.time()
                return {
                    "success": response.status_code == 200,
                    "response_time": end_time - start_time,
                    "status_code": response.status_code
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "response_time": time.time() - start_time
                }
        
        try:
            start_time = time.time()
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(single_request) for _ in range(num_requests)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            end_time = time.time()
            
            successful = sum(1 for r in results if r["success"])
            avg_response_time = sum(r["response_time"] for r in results) / len(results)
            total_time = end_time - start_time
            
            result = {
                "test": "performance_stress",
                "success": successful > 0,
                "total_requests": num_requests,
                "successful_requests": successful,
                "failed_requests": num_requests - successful,
                "average_response_time": avg_response_time,
                "total_time": total_time,
                "throughput": num_requests / total_time if total_time > 0 else 0
            }
            
            print(f"Performance Stress: {'✅ PASS' if result['success'] else '❌ FAIL'}")
            print(f"  Successful: {successful}/{num_requests}")
            print(f"  Average Response Time: {avg_response_time:.2f}s")
            print(f"  Total Time: {total_time:.2f}s")
            print(f"  Throughput: {result['throughput']:.2f} req/s")
            
            return result
        except Exception as e:
            result = {
                "test": "performance_stress",
                "success": False,
                "error": str(e)
            }
            print(f"Performance Stress: ❌ FAIL - {e}")
            return result
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and generate report."""
        print("🚀 Starting RTX 5090 Inference Server Test Suite")
        print("=" * 60)
        
        tests = [
            self.test_health,
            self.test_status,
            self.test_model_management,
            self.test_basic_inference,
            self.test_context_inference,
            self.test_voice_synthesis,
            lambda: self.test_performance_stress(3)
        ]
        
        results = []
        start_time = time.time()
        
        for test_func in tests:
            try:
                result = test_func()
                results.append(result)
                self.test_results.append(result)
                print()  # Add spacing between tests
            except Exception as e:
                print(f"Test failed with exception: {e}")
                results.append({
                    "test": test_func.__name__,
                    "success": False,
                    "error": str(e)
                })
        
        end_time = time.time()
        
        # Generate summary
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r["success"])
        failed_tests = total_tests - passed_tests
        
        summary = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests / total_tests) * 100 if total_tests > 0 else 0,
            "total_time": end_time - start_time,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "test_results": results
        }
        
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        print(f"Total Time: {summary['total_time']:.2f}s")
        print("=" * 60)
        
        return summary

def main():
    """Main test function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="RTX 5090 Inference Server Test Client")
    parser.add_argument("--url", default="http://localhost:8000", help="Server URL")
    parser.add_argument("--test", choices=["all", "health", "status", "inference", "voice", "stress"], 
                       default="all", help="Specific test to run")
    parser.add_argument("--output", help="Save results to JSON file")
    
    args = parser.parse_args()
    
    client = InferenceTestClient(args.url)
    
    if args.test == "all":
        results = client.run_all_tests()
    elif args.test == "health":
        results = client.test_health()
    elif args.test == "status":
        results = client.test_status()
    elif args.test == "inference":
        results = client.test_basic_inference()
    elif args.test == "voice":
        results = client.test_voice_synthesis()
    elif args.test == "stress":
        results = client.test_performance_stress(5)
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to: {args.output}")

if __name__ == "__main__":
    main()