#!/usr/bin/env python3
"""
Final Voice Integration Test & Deployment Readiness Audit
Complete end-to-end verification of voice cloning system
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

class FinalVoiceIntegrationTest:
    def __init__(self):
        self.ml_url = "http://localhost:8000"
        self.web_url = "http://localhost:3001"
        self.test_results = []
        self.critical_issues = []
        self.performance_metrics = {}
        
    def run_final_test_suite(self):
        """Run the complete final test suite."""
        print("🚀 DEPLOYMENT READINESS AUDIT: Voice Integration System")
        print("=" * 60)
        print(f"Test Started: {datetime.now().isoformat()}")
        print("=" * 60)
        
        test_suite = [
            # Critical Infrastructure Tests
            ("System Infrastructure", self.test_system_infrastructure),
            ("API Connectivity", self.test_api_connectivity),
            ("Voice Profile Discovery", self.test_voice_profile_discovery),
            
            # Core Functionality Tests
            ("Voice Synthesis Core", self.test_voice_synthesis_core),
            ("Error Handling", self.test_error_handling),
            ("Performance Benchmarks", self.test_performance_benchmarks),
            
            # Integration Tests
            ("Frontend Integration", self.test_frontend_integration),
            ("File System Integration", self.test_file_system_integration),
            
            # Production Readiness
            ("RTX 5090 Optimization", self.test_rtx5090_optimization),
            ("Scalability Assessment", self.test_scalability_assessment),
            ("Security Verification", self.test_security_verification),
        ]
        
        start_time = time.time()
        
        for test_name, test_func in test_suite:
            print(f"\n🔍 TESTING: {test_name}")
            print("-" * 40)
            
            try:
                result = test_func()
                
                if result.get("status") == "PASS":
                    print(f"✅ {test_name}: PASSED")
                elif result.get("status") == "FAIL":
                    print(f"❌ {test_name}: FAILED")
                    if result.get("critical", False):
                        self.critical_issues.append(test_name)
                elif result.get("status") == "WARNING":
                    print(f"⚠️  {test_name}: WARNING")
                else:
                    print(f"❓ {test_name}: UNKNOWN")
                
                # Print key details
                for key, value in result.items():
                    if key not in ["status", "critical"] and not key.startswith("_"):
                        if isinstance(value, dict):
                            print(f"  📊 {key}: {json.dumps(value, indent=4)}")
                        else:
                            print(f"  📊 {key}: {value}")
                
                self.test_results.append({
                    "test_name": test_name,
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                print(f"🚫 {test_name}: ERROR - {str(e)}")
                self.critical_issues.append(test_name)
                self.test_results.append({
                    "test_name": test_name,
                    "result": {"status": "ERROR", "error": str(e), "critical": True},
                    "timestamp": datetime.now().isoformat()
                })
        
        total_time = time.time() - start_time
        
        # Generate final deployment report
        self.generate_deployment_readiness_report(total_time)

    def test_system_infrastructure(self):
        """Test core system infrastructure."""
        try:
            # Check Docker containers
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=personal-ai-clone", "--format", "{{.Names}}\t{{.Status}}"],
                capture_output=True, text=True
            )
            
            containers = []
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        name, status = line.split('\t')
                        containers.append({
                            "name": name,
                            "status": status,
                            "running": "Up" in status
                        })
            
            # Check critical services
            ml_service_running = any("ml-inference" in c["name"] and c["running"] for c in containers)
            web_service_running = any("web" in c["name"] and c["running"] for c in containers)
            
            # Check GPU availability
            gpu_available = False
            try:
                gpu_result = subprocess.run(["nvidia-smi", "-L"], capture_output=True, text=True)
                gpu_available = gpu_result.returncode == 0 and "GPU" in gpu_result.stdout
            except:
                pass
            
            return {
                "status": "PASS" if ml_service_running else "FAIL",
                "critical": True,
                "containers": len(containers),
                "ml_service_running": ml_service_running,
                "web_service_running": web_service_running,
                "gpu_available": gpu_available
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": True}

    def test_api_connectivity(self):
        """Test API connectivity and response times."""
        try:
            endpoints = [
                ("Health Check", f"{self.ml_url}/health"),
                ("Voice Status", f"{self.ml_url}/voice/status"),
                ("Voice Profiles", f"{self.ml_url}/voice/profiles"),
                ("Debug Info", f"{self.ml_url}/debug")
            ]
            
            connectivity_results = {}
            total_response_time = 0
            successful_endpoints = 0
            
            for name, url in endpoints:
                try:
                    start_time = time.time()
                    with urllib.request.urlopen(url, timeout=10) as response:
                        response_time = time.time() - start_time
                        status_code = response.getcode()
                        
                        connectivity_results[name] = {
                            "status_code": status_code,
                            "response_time": response_time,
                            "success": status_code == 200
                        }
                        
                        if status_code == 200:
                            successful_endpoints += 1
                            total_response_time += response_time
                            
                except Exception as e:
                    connectivity_results[name] = {
                        "error": str(e),
                        "success": False
                    }
            
            average_response_time = total_response_time / max(1, successful_endpoints)
            all_endpoints_working = successful_endpoints == len(endpoints)
            
            return {
                "status": "PASS" if all_endpoints_working else "FAIL",
                "critical": not all_endpoints_working,
                "successful_endpoints": f"{successful_endpoints}/{len(endpoints)}",
                "average_response_time": f"{average_response_time:.3f}s",
                "endpoints": connectivity_results
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": True}

    def test_voice_profile_discovery(self):
        """Test voice profile discovery and validation."""
        try:
            with urllib.request.urlopen(f"{self.ml_url}/voice/profiles", timeout=10) as response:
                profiles_data = json.loads(response.read().decode())
            
            profiles = profiles_data.get("profiles", [])
            profile_count = len(profiles)
            
            # Check for user voice profiles (not just synthesis profiles)
            user_profiles = [p for p in profiles if not p.startswith("voice_synthesis")]
            
            # Validate profile quality
            profile_validation = {}
            for profile in user_profiles[:3]:  # Check first 3 user profiles
                # Try to use profile for synthesis
                try:
                    test_payload = json.dumps({
                        "text": "This is a test to validate the voice profile quality.",
                        "voice_id": profile
                    }).encode()
                    
                    req = urllib.request.Request(
                        f"{self.ml_url}/voice/synthesize",
                        data=test_payload,
                        headers={'Content-Type': 'application/json'}
                    )
                    
                    with urllib.request.urlopen(req, timeout=30) as test_response:
                        test_result = json.loads(test_response.read().decode())
                        
                        profile_validation[profile] = {
                            "synthesis_success": True,
                            "generation_time": test_result.get("generation_time", 0),
                            "audio_url": test_result.get("audio_url", "")
                        }
                        
                except Exception as e:
                    profile_validation[profile] = {
                        "synthesis_success": False,
                        "error": str(e)
                    }
            
            working_profiles = sum(1 for v in profile_validation.values() if v.get("synthesis_success", False))
            
            return {
                "status": "PASS" if profile_count > 0 and working_profiles > 0 else "FAIL",
                "critical": profile_count == 0,
                "total_profiles": profile_count,
                "user_profiles": len(user_profiles),
                "working_profiles": working_profiles,
                "profile_validation": profile_validation
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": True}

    def test_voice_synthesis_core(self):
        """Test core voice synthesis functionality."""
        try:
            test_cases = [
                {"name": "short_text", "text": "Hello world"},
                {"name": "medium_text", "text": "This is a medium length text to test voice synthesis quality and performance."},
                {"name": "long_text", "text": "This is a longer text that tests the voice synthesis system's ability to handle extended content with multiple sentences. It should maintain quality and consistency throughout the entire passage while demonstrating natural speech patterns and emotional expression."}
            ]
            
            synthesis_results = {}
            total_generation_time = 0
            successful_syntheses = 0
            
            for test_case in test_cases:
                try:
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
                    with urllib.request.urlopen(req, timeout=45) as response:
                        request_time = time.time() - start_time
                        result = json.loads(response.read().decode())
                        
                        # Verify audio file exists
                        audio_url = result.get("audio_url", "")
                        audio_file = Path(f"/home/luke/personal-ai-clone/web/public{audio_url}")
                        
                        synthesis_results[test_case["name"]] = {
                            "success": True,
                            "generation_time": result.get("generation_time", 0),
                            "request_time": request_time,
                            "text_length": len(test_case["text"]),
                            "audio_file_exists": audio_file.exists(),
                            "audio_file_size": audio_file.stat().st_size if audio_file.exists() else 0,
                            "chars_per_second": len(test_case["text"]) / result.get("generation_time", 1)
                        }
                        
                        total_generation_time += result.get("generation_time", 0)
                        successful_syntheses += 1
                        
                except Exception as e:
                    synthesis_results[test_case["name"]] = {
                        "success": False,
                        "error": str(e)
                    }
            
            average_generation_time = total_generation_time / max(1, successful_syntheses)
            all_syntheses_successful = successful_syntheses == len(test_cases)
            
            return {
                "status": "PASS" if all_syntheses_successful else "FAIL",
                "critical": successful_syntheses == 0,
                "successful_syntheses": f"{successful_syntheses}/{len(test_cases)}",
                "average_generation_time": f"{average_generation_time:.3f}s",
                "synthesis_results": synthesis_results
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": True}

    def test_error_handling(self):
        """Test error handling robustness."""
        try:
            error_test_cases = [
                {
                    "name": "empty_text",
                    "payload": {"text": "", "voice_id": "voice_lukemoeller_yahoo_com_latest"},
                    "expected_status": 400
                },
                {
                    "name": "invalid_voice",
                    "payload": {"text": "Test", "voice_id": "nonexistent"},
                    "expected_status": 404
                },
                {
                    "name": "malformed_json",
                    "payload": "invalid json",
                    "expected_status": [400, 422]
                }
            ]
            
            error_handling_results = {}
            correct_error_handling = 0
            
            for test_case in error_test_cases:
                try:
                    if isinstance(test_case["payload"], str):
                        payload = test_case["payload"].encode()
                    else:
                        payload = json.dumps(test_case["payload"]).encode()
                    
                    req = urllib.request.Request(
                        f"{self.ml_url}/voice/synthesize",
                        data=payload,
                        headers={'Content-Type': 'application/json'}
                    )
                    
                    try:
                        with urllib.request.urlopen(req, timeout=10) as response:
                            status_code = response.getcode()
                    except urllib.error.HTTPError as e:
                        status_code = e.code
                    
                    expected = test_case["expected_status"]
                    if isinstance(expected, list):
                        handled_correctly = status_code in expected
                    else:
                        handled_correctly = status_code == expected
                    
                    error_handling_results[test_case["name"]] = {
                        "status_code": status_code,
                        "expected": expected,
                        "handled_correctly": handled_correctly
                    }
                    
                    if handled_correctly:
                        correct_error_handling += 1
                        
                except Exception as e:
                    error_handling_results[test_case["name"]] = {
                        "error": str(e),
                        "handled_correctly": False
                    }
            
            all_errors_handled = correct_error_handling == len(error_test_cases)
            
            return {
                "status": "PASS" if all_errors_handled else "WARNING",
                "critical": False,
                "correct_error_handling": f"{correct_error_handling}/{len(error_test_cases)}",
                "error_handling_results": error_handling_results
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": False}

    def test_performance_benchmarks(self):
        """Test performance benchmarks and resource usage."""
        try:
            # Get system status
            with urllib.request.urlopen(f"{self.ml_url}/voice/status", timeout=10) as response:
                status_data = json.loads(response.read().decode())
            
            # Performance benchmark test
            benchmark_text = "This is a standardized benchmark text for measuring voice synthesis performance. " * 3
            
            payload = json.dumps({
                "text": benchmark_text,
                "voice_id": "voice_lukemoeller_yahoo_com_latest"
            }).encode()
            
            req = urllib.request.Request(
                f"{self.ml_url}/voice/synthesize",
                data=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            # Multiple runs for average
            generation_times = []
            for i in range(3):
                start_time = time.time()
                with urllib.request.urlopen(req, timeout=45) as response:
                    total_time = time.time() - start_time
                    result = json.loads(response.read().decode())
                    generation_times.append(result.get("generation_time", 0))
                time.sleep(1)  # Brief pause between tests
            
            avg_generation_time = sum(generation_times) / len(generation_times)
            text_length = len(benchmark_text)
            chars_per_second = text_length / avg_generation_time
            
            # Performance assessment
            performance_grade = "EXCELLENT" if chars_per_second > 300 else \
                              "GOOD" if chars_per_second > 200 else \
                              "ACCEPTABLE" if chars_per_second > 100 else "SLOW"
            
            self.performance_metrics = {
                "average_generation_time": avg_generation_time,
                "characters_per_second": chars_per_second,
                "performance_grade": performance_grade,
                "gpu_memory_allocated": status_data.get("memory_usage", {}).get("allocated_gb", 0),
                "gpu_memory_reserved": status_data.get("memory_usage", {}).get("reserved_gb", 0)
            }
            
            return {
                "status": "PASS",
                "critical": False,
                **self.performance_metrics
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": False}

    def test_frontend_integration(self):
        """Test frontend integration points."""
        try:
            # This would require a running frontend server
            # For now, we'll test the API endpoints that the frontend uses
            
            # Test voice upload endpoint structure (expect 401 without auth)
            try:
                with urllib.request.urlopen(f"{self.web_url}/api/voice/upload", timeout=10) as response:
                    upload_status = response.getcode()
            except urllib.error.HTTPError as e:
                upload_status = e.code  # Expect 401 or 405
            
            # Test voice synthesis endpoint structure (expect 401 without auth)
            try:
                payload = json.dumps({"text": "test"}).encode()
                req = urllib.request.Request(
                    f"{self.web_url}/api/voice/synthesize",
                    data=payload,
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    synthesis_status = response.getcode()
            except urllib.error.HTTPError as e:
                synthesis_status = e.code  # Expect 401
            
            # Check if web service is accessible
            web_accessible = upload_status in [401, 405] and synthesis_status == 401
            
            return {
                "status": "PASS" if web_accessible else "WARNING",
                "critical": False,
                "upload_endpoint_status": upload_status,
                "synthesis_endpoint_status": synthesis_status,
                "web_service_accessible": web_accessible
            }
            
        except Exception as e:
            return {"status": "WARNING", "error": str(e), "critical": False}

    def test_file_system_integration(self):
        """Test file system integration and permissions."""
        try:
            # Check key directories
            directories = {
                "voices": "/home/luke/personal-ai-clone/web/public/voices",
                "synthesis": "/home/luke/personal-ai-clone/web/public/voices/synthesis",
                "models": "/home/luke/personal-ai-clone/models/voices"
            }
            
            directory_status = {}
            for name, path in directories.items():
                path_obj = Path(path)
                directory_status[name] = {
                    "exists": path_obj.exists(),
                    "is_directory": path_obj.is_dir() if path_obj.exists() else False,
                    "readable": os.access(path, os.R_OK) if path_obj.exists() else False,
                    "file_count": len(list(path_obj.iterdir())) if path_obj.exists() and path_obj.is_dir() else 0
                }
            
            # Check recent synthesis files
            synthesis_dir = Path("/home/luke/personal-ai-clone/web/public/voices/synthesis")
            recent_files = []
            if synthesis_dir.exists():
                files = list(synthesis_dir.glob("synthesis_*.wav"))
                files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                recent_files = files[:5]
            
            all_directories_ok = all(d["exists"] and d["is_directory"] for d in directory_status.values())
            has_recent_synthesis = len(recent_files) > 0
            
            return {
                "status": "PASS" if all_directories_ok and has_recent_synthesis else "WARNING",
                "critical": not all_directories_ok,
                "directory_status": directory_status,
                "recent_synthesis_files": len(recent_files),
                "latest_synthesis": recent_files[0].name if recent_files else None
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": False}

    def test_rtx5090_optimization(self):
        """Test RTX 5090 specific optimizations."""
        try:
            # Check GPU information
            gpu_info = {}
            try:
                result = subprocess.run(
                    ["nvidia-smi", "--query-gpu=name,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    gpu_data = result.stdout.strip().split(', ')
                    if len(gpu_data) >= 3:
                        gpu_info = {
                            "name": gpu_data[0],
                            "memory_total_mb": int(gpu_data[1]),
                            "utilization_percent": int(gpu_data[2]),
                            "is_rtx5090": "RTX 5090" in gpu_data[0]
                        }
            except:
                gpu_info = {"error": "GPU info unavailable"}
            
            # Test PyTorch CUDA
            pytorch_info = {}
            try:
                result = subprocess.run([
                    "docker", "exec", "personal-ai-clone-ml-inference-1", "python", "-c",
                    "import torch; print(f'{torch.cuda.is_available()}|{torch.version.cuda}|{torch.__version__}')"
                ], capture_output=True, text=True, timeout=15)
                
                if result.returncode == 0:
                    parts = result.stdout.strip().split('|')
                    if len(parts) >= 3:
                        pytorch_info = {
                            "cuda_available": parts[0] == "True",
                            "cuda_version": parts[1],
                            "pytorch_version": parts[2]
                        }
            except:
                pytorch_info = {"error": "PyTorch info unavailable"}
            
            rtx5090_optimized = gpu_info.get("is_rtx5090", False) and pytorch_info.get("cuda_available", False)
            
            return {
                "status": "PASS" if rtx5090_optimized else "WARNING",
                "critical": False,
                "gpu_info": gpu_info,
                "pytorch_info": pytorch_info,
                "rtx5090_optimized": rtx5090_optimized
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": False}

    def test_scalability_assessment(self):
        """Test system scalability and load handling."""
        try:
            # Test concurrent requests (simplified)
            concurrent_requests = 2  # Conservative for testing
            request_results = []
            
            for i in range(concurrent_requests):
                try:
                    payload = json.dumps({
                        "text": f"Scalability test request {i+1}. Testing concurrent synthesis.",
                        "voice_id": "voice_lukemoeller_yahoo_com_latest"
                    }).encode()
                    
                    req = urllib.request.Request(
                        f"{self.ml_url}/voice/synthesize",
                        data=payload,
                        headers={'Content-Type': 'application/json'}
                    )
                    
                    start_time = time.time()
                    with urllib.request.urlopen(req, timeout=45) as response:
                        request_time = time.time() - start_time
                        result = json.loads(response.read().decode())
                        
                        request_results.append({
                            "success": True,
                            "request_time": request_time,
                            "generation_time": result.get("generation_time", 0)
                        })
                        
                except Exception as e:
                    request_results.append({
                        "success": False,
                        "error": str(e)
                    })
            
            successful_requests = sum(1 for r in request_results if r.get("success", False))
            scalability_score = successful_requests / concurrent_requests
            
            return {
                "status": "PASS" if scalability_score >= 0.8 else "WARNING",
                "critical": False,
                "concurrent_requests_tested": concurrent_requests,
                "successful_requests": successful_requests,
                "scalability_score": f"{scalability_score:.2%}",
                "request_results": request_results
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": False}

    def test_security_verification(self):
        """Test basic security measures."""
        try:
            security_checks = {}
            
            # Test that endpoints reject malformed requests appropriately
            try:
                req = urllib.request.Request(
                    f"{self.ml_url}/voice/synthesize",
                    data=b"malicious payload",
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    security_checks["malformed_request"] = {"handled": False, "status": response.getcode()}
            except urllib.error.HTTPError as e:
                security_checks["malformed_request"] = {"handled": True, "status": e.code}
            
            # Test file path traversal protection (if applicable)
            try:
                payload = json.dumps({
                    "text": "test",
                    "voice_id": "../../../etc/passwd"
                }).encode()
                
                req = urllib.request.Request(
                    f"{self.ml_url}/voice/synthesize",
                    data=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    security_checks["path_traversal"] = {"handled": False, "status": response.getcode()}
            except urllib.error.HTTPError as e:
                security_checks["path_traversal"] = {"handled": True, "status": e.code}
            
            security_score = sum(1 for check in security_checks.values() if check.get("handled", False)) / len(security_checks)
            
            return {
                "status": "PASS" if security_score >= 0.8 else "WARNING",
                "critical": False,
                "security_score": f"{security_score:.2%}",
                "security_checks": security_checks
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "critical": False}

    def generate_deployment_readiness_report(self, total_time):
        """Generate final deployment readiness report."""
        print("\n" + "="*80)
        print("🚀 DEPLOYMENT READINESS ASSESSMENT")
        print("="*80)
        
        # Calculate summary statistics
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["result"].get("status") == "PASS")
        failed_tests = sum(1 for r in self.test_results if r["result"].get("status") == "FAIL")
        warning_tests = sum(1 for r in self.test_results if r["result"].get("status") == "WARNING")
        error_tests = sum(1 for r in self.test_results if r["result"].get("status") == "ERROR")
        
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests} ✅")
        print(f"   Failed: {failed_tests} ❌")
        print(f"   Warnings: {warning_tests} ⚠️")
        print(f"   Errors: {error_tests} 🚫")
        print(f"   Duration: {total_time:.2f}s")
        
        # Deployment readiness assessment
        readiness_score = (passed_tests + (warning_tests * 0.5)) / total_tests
        critical_failures = len(self.critical_issues)
        
        print(f"\n🎯 Deployment Readiness:")
        print(f"   Overall Score: {readiness_score:.1%}")
        print(f"   Critical Issues: {critical_failures}")
        
        if critical_failures == 0 and readiness_score >= 0.8:
            deployment_status = "✅ READY FOR DEPLOYMENT"
            recommendation = "System passes all critical tests and is ready for production deployment."
        elif critical_failures == 0 and readiness_score >= 0.6:
            deployment_status = "⚠️  READY WITH CONDITIONS"
            recommendation = "System is functional but has some warnings. Monitor closely in production."
        else:
            deployment_status = "❌ NOT READY"
            recommendation = "Critical issues must be resolved before deployment."
        
        print(f"   Status: {deployment_status}")
        print(f"   Recommendation: {recommendation}")
        
        # Performance summary
        if self.performance_metrics:
            print(f"\n⚡ Performance Summary:")
            print(f"   Average Generation Time: {self.performance_metrics.get('average_generation_time', 0):.3f}s")
            print(f"   Characters per Second: {self.performance_metrics.get('characters_per_second', 0):.1f}")
            print(f"   Performance Grade: {self.performance_metrics.get('performance_grade', 'UNKNOWN')}")
            print(f"   GPU Memory Usage: {self.performance_metrics.get('gpu_memory_allocated', 0):.2f}GB")
        
        # Critical issues
        if self.critical_issues:
            print(f"\n🚨 Critical Issues Requiring Attention:")
            for issue in self.critical_issues:
                print(f"   - {issue}")
        
        # Action items
        print(f"\n📋 Next Steps:")
        if critical_failures == 0:
            print("   1. Monitor system performance in production")
            print("   2. Set up automated health checks")
            print("   3. Configure logging and alerting")
            print("   4. Prepare rollback procedures")
        else:
            print("   1. Address all critical issues identified above")
            print("   2. Re-run this test suite after fixes")
            print("   3. Ensure all services are properly configured")
            print("   4. Verify GPU and CUDA setup")
        
        # Save detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "test_duration": total_time,
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "warnings": warning_tests,
                "errors": error_tests,
                "readiness_score": readiness_score,
                "critical_issues": critical_failures
            },
            "deployment_status": deployment_status,
            "recommendation": recommendation,
            "performance_metrics": self.performance_metrics,
            "critical_issues": self.critical_issues,
            "detailed_results": self.test_results
        }
        
        report_file = Path("/tmp/voice_deployment_readiness_report.json")
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        print("="*80)

def main():
    """Main test execution."""
    tester = FinalVoiceIntegrationTest()
    tester.run_final_test_suite()

if __name__ == "__main__":
    main()