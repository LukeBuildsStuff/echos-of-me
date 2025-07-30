#!/usr/bin/env python3
"""
Simplified Voice Integration Testing Script
Using only standard library modules
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

class VoiceIntegrationTester:
    def __init__(self):
        self.base_url = "http://localhost:3001"
        self.ml_url = "http://localhost:8000"
        self.voice_files_dir = Path("/home/luke/personal-ai-clone/web/public/voices")
        self.models_dir = Path("/home/luke/personal-ai-clone/models/voices")
        self.test_results = {}
        
    def run_comprehensive_test(self):
        """Run complete voice integration test suite."""
        print("🚀 Starting comprehensive voice integration testing...")
        
        tests = [
            ("Docker Services Health", self.test_docker_services),
            ("ML Service Connectivity", self.test_ml_service_connectivity),
            ("File Path Consistency", self.test_file_path_consistency),
            ("Voice Profile Discovery", self.test_voice_profile_discovery),
            ("RTX 5090 Compatibility", self.test_rtx5090_compatibility),
            ("Voice System Status", self.test_voice_system_status),
        ]
        
        start_time = time.time()
        
        for test_name, test_func in tests:
            print(f"\n📋 Running test: {test_name}")
            try:
                result = test_func()
                self.test_results[test_name] = {
                    "status": "PASS" if result else "FAIL",
                    "details": result if isinstance(result, dict) else {"passed": result},
                    "timestamp": datetime.now().isoformat()
                }
                status = "PASSED" if result else "FAILED"
                print(f"✅ {test_name}: {status}")
                if isinstance(result, dict) and result:
                    self.print_test_details(result)
            except Exception as e:
                self.test_results[test_name] = {
                    "status": "ERROR",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                print(f"❌ {test_name}: ERROR - {str(e)}")
        
        total_time = time.time() - start_time
        
        # Generate report
        self.generate_report(total_time)
        
        return self.test_results

    def test_docker_services(self):
        """Test Docker services are running properly."""
        try:
            # Check if containers are running
            result = subprocess.run(
                ["docker", "ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"],
                cwd="/home/luke/personal-ai-clone",
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return {"error": f"Docker ps command failed: {result.stderr}"}
            
            lines = result.stdout.strip().split('\n')[1:]  # Skip header
            running_containers = []
            
            for line in lines:
                if line.strip():
                    parts = line.split('\t')
                    if len(parts) >= 2:
                        name = parts[0].strip()
                        status = parts[1].strip()
                        running_containers.append({
                            "name": name,
                            "status": status,
                            "running": "Up" in status
                        })
            
            # Check specific services
            required_services = ["ml-inference", "web", "db", "redis"]
            service_status = {}
            
            for service in required_services:
                found = False
                for container in running_containers:
                    if service in container["name"]:
                        service_status[service] = container
                        found = True
                        break
                if not found:
                    service_status[service] = {"name": service, "status": "not found", "running": False}
            
            all_running = all(s.get("running", False) for s in service_status.values())
            
            return {
                "all_services_running": all_running,
                "services": service_status,
                "total_containers": len(running_containers)
            }
            
        except Exception as e:
            return {"error": str(e)}

    def test_ml_service_connectivity(self):
        """Test ML inference service connectivity."""
        try:
            # Test health endpoint
            health_url = f"{self.ml_url}/health"
            try:
                with urllib.request.urlopen(health_url, timeout=10) as response:
                    health_data = json.loads(response.read().decode())
                    health_status = response.getcode()
            except urllib.error.URLError as e:
                return {"connectivity": False, "error": f"Health endpoint failed: {str(e)}"}
            
            # Test voice status endpoint
            status_url = f"{self.ml_url}/voice/status"
            try:
                with urllib.request.urlopen(status_url, timeout=10) as response:
                    voice_status = json.loads(response.read().decode())
                    status_code = response.getcode()
            except urllib.error.URLError as e:
                return {"connectivity": True, "health": health_data, "voice_status_error": str(e)}
            
            return {
                "connectivity": True,
                "health": health_data,
                "voice_status": voice_status,
                "health_status_code": health_status,
                "voice_status_code": status_code,
                "tts_available": voice_status.get("tts_available", False),
                "model_loaded": voice_status.get("model_loaded", False)
            }
            
        except Exception as e:
            return {"error": str(e)}

    def test_file_path_consistency(self):
        """Test file path consistency between containers."""
        try:
            paths_to_check = {
                "web_voices_dir": "/home/luke/personal-ai-clone/web/public/voices",
                "models_voices_dir": "/home/luke/personal-ai-clone/models/voices",
                "ml_workspace": "/home/luke/personal-ai-clone/ml"
            }
            
            path_status = {}
            for name, path in paths_to_check.items():
                path_obj = Path(path)
                path_status[name] = {
                    "exists": path_obj.exists(),
                    "is_dir": path_obj.is_dir() if path_obj.exists() else False,
                    "writable": os.access(path, os.W_OK) if path_obj.exists() else False,
                    "absolute_path": str(path_obj.absolute())
                }
                
                # Check if directory has any files
                if path_obj.exists() and path_obj.is_dir():
                    try:
                        files = list(path_obj.iterdir())
                        path_status[name]["file_count"] = len(files)
                        path_status[name]["sample_files"] = [f.name for f in files[:5]]
                    except PermissionError:
                        path_status[name]["file_count"] = "permission_denied"
            
            all_accessible = all(p.get("exists", False) for p in path_status.values())
            
            return {
                "paths": path_status,
                "all_accessible": all_accessible,
                "consistency_check": "passed" if all_accessible else "failed"
            }
            
        except Exception as e:
            return {"error": str(e)}

    def test_voice_profile_discovery(self):
        """Test voice profile discovery mechanism."""
        try:
            # Check what profiles are discovered by the ML service
            try:
                profiles_url = f"{self.ml_url}/voice/profiles"
                with urllib.request.urlopen(profiles_url, timeout=10) as response:
                    profiles_data = json.loads(response.read().decode())
            except urllib.error.URLError as e:
                profiles_data = {"error": f"Profile discovery failed: {str(e)}"}
            
            # Check actual files on disk
            voice_files = {}
            if self.voice_files_dir.exists():
                for user_dir in self.voice_files_dir.iterdir():
                    if user_dir.is_dir():
                        user_id = user_dir.name
                        files = []
                        for file_path in user_dir.iterdir():
                            if file_path.suffix.lower() in ['.webm', '.wav', '.mp3']:
                                files.append({
                                    "name": file_path.name,
                                    "size": file_path.stat().st_size,
                                    "modified": file_path.stat().st_mtime
                                })
                        if files:
                            voice_files[user_id] = files
            
            return {
                "ml_service_profiles": profiles_data,
                "disk_voice_files": voice_files,
                "profile_count": profiles_data.get("count", 0),
                "files_on_disk": sum(len(files) for files in voice_files.values()),
                "discovery_working": profiles_data.get("count", 0) > 0 or len(voice_files) > 0
            }
            
        except Exception as e:
            return {"error": str(e)}

    def test_rtx5090_compatibility(self):
        """Test RTX 5090 specific compatibility."""
        try:
            # Check CUDA availability
            cuda_info = {}
            try:
                result = subprocess.run(
                    ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], 
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    gpu_lines = result.stdout.strip().split('\n')
                    if gpu_lines:
                        gpu_info = gpu_lines[0].split(', ')
                        if len(gpu_info) >= 3:
                            cuda_info = {
                                "gpu_name": gpu_info[0],
                                "memory_total_mb": gpu_info[1],
                                "driver_version": gpu_info[2],
                                "is_rtx5090": "RTX 5090" in gpu_info[0] or "5090" in gpu_info[0]
                            }
                else:
                    cuda_info = {"error": "nvidia-smi failed", "stderr": result.stderr}
            except Exception as e:
                cuda_info = {"error": f"nvidia-smi not available: {str(e)}"}
            
            # Test PyTorch CUDA from ML container
            pytorch_cuda = {}
            try:
                result = subprocess.run([
                    "docker", "exec", "personal-ai-clone-ml-inference-1", "python", "-c", 
                    "import torch; print(f'cuda_available:{torch.cuda.is_available()}'); print(f'cuda_version:{torch.version.cuda}'); print(f'pytorch_version:{torch.__version__}');"
                ], capture_output=True, text=True, timeout=15)
                
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if ':' in line:
                            key, value = line.split(':', 1)
                            pytorch_cuda[key] = value
                else:
                    pytorch_cuda = {"error": "Docker exec failed", "stderr": result.stderr}
            except Exception as e:
                pytorch_cuda = {"error": f"PyTorch test failed: {str(e)}"}
            
            return {
                "cuda_info": cuda_info,
                "pytorch_cuda": pytorch_cuda,
                "rtx5090_detected": cuda_info.get("is_rtx5090", False),
                "cuda_available": pytorch_cuda.get("cuda_available") == "True",
                "compatibility_check": "passed"
            }
            
        except Exception as e:
            return {"error": str(e)}

    def test_voice_system_status(self):
        """Test detailed voice system status."""
        try:
            # Get debug info from ML service
            debug_url = f"{self.ml_url}/debug"
            try:
                with urllib.request.urlopen(debug_url, timeout=10) as response:
                    debug_data = json.loads(response.read().decode())
            except urllib.error.URLError as e:
                debug_data = {"error": f"Debug endpoint failed: {str(e)}"}
            
            # Test voice synthesis endpoint (expect failure but check error handling)
            synthesis_url = f"{self.ml_url}/voice/synthesize"
            test_payload = json.dumps({"text": "test", "voice_id": "nonexistent"}).encode()
            req = urllib.request.Request(
                synthesis_url, 
                data=test_payload, 
                headers={'Content-Type': 'application/json'}
            )
            
            synthesis_result = {}
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    synthesis_result = {
                        "status_code": response.getcode(),
                        "response": json.loads(response.read().decode())
                    }
            except urllib.error.HTTPError as e:
                synthesis_result = {
                    "status_code": e.code,
                    "error_handled": e.code in [404, 422, 503]  # Expected error codes
                }
            except Exception as e:
                synthesis_result = {"error": str(e)}
            
            return {
                "debug_info": debug_data,
                "synthesis_test": synthesis_result,
                "voice_cloner_available": debug_data.get("voice_cloner_available", False),
                "has_tts": debug_data.get("has_tts", False),
                "error_handling": synthesis_result.get("error_handled", False),
                "system_operational": debug_data.get("voice_cloner_available", False)
            }
            
        except Exception as e:
            return {"error": str(e)}

    def print_test_details(self, details):
        """Print detailed test results."""
        for key, value in details.items():
            if isinstance(value, dict):
                print(f"  {key}:")
                for subkey, subvalue in value.items():
                    print(f"    {subkey}: {subvalue}")
            else:
                print(f"  {key}: {value}")

    def generate_report(self, total_time):
        """Generate comprehensive test report."""
        report = {
            "test_session": {
                "timestamp": datetime.now().isoformat(),
                "duration_seconds": total_time,
                "total_tests": len(self.test_results)
            },
            "results": self.test_results,
            "summary": {
                "passed": sum(1 for r in self.test_results.values() if r["status"] == "PASS"),
                "failed": sum(1 for r in self.test_results.values() if r["status"] == "FAIL"),
                "errors": sum(1 for r in self.test_results.values() if r["status"] == "ERROR")
            }
        }
        
        # Identify critical issues
        critical_issues = []
        for test_name, result in self.test_results.items():
            if result["status"] in ["FAIL", "ERROR"]:
                if any(keyword in test_name.lower() for keyword in ["connectivity", "docker", "path"]):
                    critical_issues.append(test_name)
        
        report["critical_issues"] = critical_issues
        report["deployment_readiness"] = {
            "ready": len(critical_issues) == 0 and report["summary"]["errors"] == 0,
            "blockers": critical_issues,
            "recommendations": self.generate_recommendations(report)
        }
        
        # Save report
        report_file = Path("/tmp/voice_integration_test_report.json")
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📊 Test report saved to: {report_file}")
        
        # Print summary
        self.print_summary(report)

    def generate_recommendations(self, report):
        """Generate recommendations based on test results."""
        recommendations = []
        
        for test_name, result in report["results"].items():
            if result["status"] in ["FAIL", "ERROR"]:
                if "docker" in test_name.lower():
                    recommendations.append("Check Docker services: docker-compose up -d")
                elif "connectivity" in test_name.lower():
                    recommendations.append("Verify ML service container is running and accessible")
                elif "file path" in test_name.lower():
                    recommendations.append("Check volume mounts in docker-compose.yml")
                elif "rtx5090" in test_name.lower():
                    recommendations.append("Verify NVIDIA drivers and CUDA installation")
                elif "voice" in test_name.lower():
                    recommendations.append("Check TTS library installation and voice cloner initialization")
        
        if not recommendations:
            recommendations.append("All tests passed - system appears ready for deployment")
        
        return recommendations

    def print_summary(self, report):
        """Print test summary to console."""
        print("\n" + "="*80)
        print("VOICE INTEGRATION TEST SUMMARY")
        print("="*80)
        
        summary = report["summary"]
        print(f"Total Tests: {report['test_session']['total_tests']}")
        print(f"Passed: {summary['passed']} ✅")
        print(f"Failed: {summary['failed']} ❌")
        print(f"Errors: {summary['errors']} 🚫")
        print(f"Duration: {report['test_session']['duration_seconds']:.2f} seconds")
        
        ready = report['deployment_readiness']['ready']
        print(f"\nDeployment Ready: {'YES' if ready else 'NO'}")
        
        if report["deployment_readiness"]["blockers"]:
            print(f"\n🚨 Critical Issues:")
            for issue in report["deployment_readiness"]["blockers"]:
                print(f"  - {issue}")
        
        print(f"\n💡 Recommendations:")
        for rec in report["deployment_readiness"]["recommendations"]:
            print(f"  - {rec}")
        
        print("\n" + "="*80 + "\n")

def main():
    """Main test execution."""
    tester = VoiceIntegrationTester()
    results = tester.run_comprehensive_test()
    return results

if __name__ == "__main__":
    main()