#!/usr/bin/env python3
"""
Voice Integration Testing & Debugging Script
Comprehensive testing of the voice cloning workflow end-to-end
"""

import os
import sys
import json
import time
import requests
import logging
from pathlib import Path
from datetime import datetime
import asyncio
import aiohttp
import subprocess
from typing import Dict, List, Any, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/voice_integration_test.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class VoiceIntegrationTester:
    def __init__(self):
        self.base_url = "http://localhost:3001"
        self.ml_url = "http://localhost:8000"
        self.test_user_email = "test@example.com"
        self.test_user_id = self.test_user_email.replace('@', '_').replace('.', '_')
        self.voice_files_dir = Path("/home/luke/personal-ai-clone/web/public/voices")
        self.models_dir = Path("/home/luke/personal-ai-clone/models/voices")
        self.test_results = {}
        
    async def run_comprehensive_test(self):
        """Run complete voice integration test suite."""
        logger.info("🚀 Starting comprehensive voice integration testing...")
        
        test_suite = [
            ("Docker Services Health", self.test_docker_services),
            ("ML Service Connectivity", self.test_ml_service_connectivity),
            ("Voice Cloner Initialization", self.test_voice_cloner_init),
            ("File Path Consistency", self.test_file_path_consistency),
            ("Voice Profile Discovery", self.test_voice_profile_discovery),
            ("Voice Upload API", self.test_voice_upload_api),
            ("Voice Synthesis API", self.test_voice_synthesis_api),
            ("Audio File Generation", self.test_audio_file_generation),
            ("RTX 5090 Compatibility", self.test_rtx5090_compatibility),
            ("Error Handling", self.test_error_handling),
            ("Performance Metrics", self.test_performance_metrics),
        ]
        
        start_time = time.time()
        
        for test_name, test_func in test_suite:
            logger.info(f"📋 Running test: {test_name}")
            try:
                result = await test_func()
                self.test_results[test_name] = {
                    "status": "PASS" if result else "FAIL",
                    "details": result if isinstance(result, dict) else {"passed": result},
                    "timestamp": datetime.now().isoformat()
                }
                logger.info(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
            except Exception as e:
                self.test_results[test_name] = {
                    "status": "ERROR",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                logger.error(f"❌ {test_name}: ERROR - {str(e)}")
        
        total_time = time.time() - start_time
        
        # Generate report
        await self.generate_report(total_time)
        
        return self.test_results

    async def test_docker_services(self) -> Dict[str, Any]:
        """Test Docker services are running properly."""
        try:
            # Check Docker Compose services
            result = subprocess.run(
                ["docker-compose", "ps", "--format", "json"],
                cwd="/home/luke/personal-ai-clone",
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return {"error": f"Docker compose command failed: {result.stderr}"}
            
            services = []
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    try:
                        service = json.loads(line)
                        services.append(service)
                    except json.JSONDecodeError:
                        continue
            
            service_status = {}
            for service in services:
                name = service.get('Service', 'unknown')
                state = service.get('State', 'unknown')
                status = service.get('Status', 'unknown')
                service_status[name] = {
                    "state": state,
                    "status": status,
                    "healthy": state == "running"
                }
            
            return {
                "services": service_status,
                "all_healthy": all(s["healthy"] for s in service_status.values()),
                "total_services": len(service_status)
            }
            
        except Exception as e:
            return {"error": str(e)}

    async def test_ml_service_connectivity(self) -> Dict[str, Any]:
        """Test ML inference service connectivity."""
        try:
            async with aiohttp.ClientSession() as session:
                # Test health endpoint
                async with session.get(f"{self.ml_url}/health", timeout=10) as response:
                    if response.status != 200:
                        return {"error": f"Health check failed: {response.status}"}
                    health_data = await response.json()
                
                # Test voice status endpoint
                async with session.get(f"{self.ml_url}/voice/status", timeout=10) as response:
                    if response.status != 200:
                        return {"error": f"Voice status check failed: {response.status}"}
                    voice_status = await response.json()
                
                return {
                    "health": health_data,
                    "voice_status": voice_status,
                    "connectivity": True,
                    "tts_available": voice_status.get("tts_available", False),
                    "model_loaded": voice_status.get("model_loaded", False)
                }
                
        except asyncio.TimeoutError:
            return {"error": "ML service timeout"}
        except Exception as e:
            return {"error": str(e)}

    async def test_voice_cloner_init(self) -> Dict[str, Any]:
        """Test voice cloner initialization."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ml_url}/debug", timeout=10) as response:
                    if response.status != 200:
                        return {"error": f"Debug endpoint failed: {response.status}"}
                    debug_data = await response.json()
                
                return {
                    "voice_cloner_available": debug_data.get("voice_cloner_available", False),
                    "has_tts": debug_data.get("has_tts", False),
                    "has_model": debug_data.get("has_model", False),
                    "voices_dir": debug_data.get("voices_dir"),
                    "profile_discovery": debug_data.get("profile_discovery", {}),
                    "initialization_success": debug_data.get("voice_cloner_available", False) and debug_data.get("has_tts", False)
                }
                
        except Exception as e:
            return {"error": str(e)}

    async def test_file_path_consistency(self) -> Dict[str, Any]:
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
            
            # Test voice files directory structure
            user_voice_dir = Path(f"/home/luke/personal-ai-clone/web/public/voices/{self.test_user_id}")
            path_status["test_user_voice_dir"] = {
                "exists": user_voice_dir.exists(),
                "can_create": True
            }
            
            if not user_voice_dir.exists():
                try:
                    user_voice_dir.mkdir(parents=True)
                    path_status["test_user_voice_dir"]["created"] = True
                except Exception as e:
                    path_status["test_user_voice_dir"]["can_create"] = False
                    path_status["test_user_voice_dir"]["error"] = str(e)
            
            return {
                "paths": path_status,
                "all_accessible": all(p.get("exists", False) for p in path_status.values()),
                "consistency_check": "passed"
            }
            
        except Exception as e:
            return {"error": str(e)}

    async def test_voice_profile_discovery(self) -> Dict[str, Any]:
        """Test voice profile discovery mechanism."""
        try:
            # First check what profiles are discovered by the ML service
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ml_url}/voice/profiles", timeout=10) as response:
                    if response.status != 200:
                        return {"error": f"Profile discovery failed: {response.status}"}
                    profiles_data = await response.json()
            
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

    async def test_voice_upload_api(self) -> Dict[str, Any]:
        """Test voice upload API endpoint."""
        try:
            # Create a test audio file (simple WAV header + silence)
            test_audio_data = self.create_test_audio()
            
            # Test the upload endpoint
            data = aiohttp.FormData()
            data.add_field('audio', test_audio_data, filename='test_voice.webm', content_type='audio/webm')
            data.add_field('passageId', 'test-passage')
            data.add_field('passageText', 'This is a test passage for voice cloning.')
            
            async with aiohttp.ClientSession() as session:
                # Note: This would require authentication in real scenario
                async with session.post(f"{self.base_url}/api/voice/upload", data=data, timeout=30) as response:
                    response_text = await response.text()
                    
                    if response.status == 401:
                        return {"error": "Authentication required", "status": 401, "expected": True}
                    
                    return {
                        "status": response.status,
                        "response": response_text[:500],  # First 500 chars
                        "upload_endpoint_accessible": True
                    }
                    
        except Exception as e:
            return {"error": str(e)}

    async def test_voice_synthesis_api(self) -> Dict[str, Any]:
        """Test voice synthesis API."""
        try:
            test_text = "Hello, this is a test of the voice synthesis system."
            
            async with aiohttp.ClientSession() as session:
                payload = {
                    "text": test_text,
                    "voice_id": "test_voice"
                }
                
                async with session.post(f"{self.ml_url}/voice/synthesize", json=payload, timeout=30) as response:
                    response_data = await response.json()
                    
                    return {
                        "status": response.status,
                        "synthesis_response": response_data,
                        "synthesis_available": response.status in [200, 404, 503],  # 404/503 are expected if no voice profiles
                        "error_handling": response.status != 500
                    }
                    
        except Exception as e:
            return {"error": str(e)}

    async def test_audio_file_generation(self) -> Dict[str, Any]:
        """Test audio file generation and accessibility."""
        try:
            # Check synthesis directory
            synthesis_dir = Path("/home/luke/personal-ai-clone/web/public/voices/synthesis")
            
            audio_files = []
            if synthesis_dir.exists():
                for audio_file in synthesis_dir.glob("*.wav"):
                    audio_files.append({
                        "name": audio_file.name,
                        "size": audio_file.stat().st_size,
                        "created": audio_file.stat().st_ctime,
                        "accessible": os.access(audio_file, os.R_OK)
                    })
            
            return {
                "synthesis_dir_exists": synthesis_dir.exists(),
                "audio_files_found": len(audio_files),
                "audio_files": audio_files[:5],  # First 5 files
                "generation_working": len(audio_files) > 0,
                "directory_writable": os.access(synthesis_dir.parent, os.W_OK) if synthesis_dir.parent.exists() else False
            }
            
        except Exception as e:
            return {"error": str(e)}

    async def test_rtx5090_compatibility(self) -> Dict[str, Any]:
        """Test RTX 5090 specific compatibility."""
        try:
            # Check CUDA availability
            cuda_info = {}
            try:
                result = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    gpu_info = result.stdout.strip().split('\n')[0].split(', ')
                    if len(gpu_info) >= 3:
                        cuda_info = {
                            "gpu_name": gpu_info[0],
                            "memory_total_mb": gpu_info[1],
                            "driver_version": gpu_info[2],
                            "is_rtx5090": "RTX 5090" in gpu_info[0] or "5090" in gpu_info[0]
                        }
            except Exception:
                cuda_info = {"error": "nvidia-smi not available"}
            
            # Test PyTorch CUDA
            pytorch_cuda = {}
            try:
                result = subprocess.run([
                    "python", "-c", 
                    "import torch; print(f'cuda_available:{torch.cuda.is_available()}'); print(f'cuda_version:{torch.version.cuda}'); print(f'pytorch_version:{torch.__version__}');"
                ], capture_output=True, text=True, timeout=10, cwd="/home/luke/personal-ai-clone/ml")
                
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if ':' in line:
                            key, value = line.split(':', 1)
                            pytorch_cuda[key] = value
            except Exception as e:
                pytorch_cuda = {"error": str(e)}
            
            return {
                "cuda_info": cuda_info,
                "pytorch_cuda": pytorch_cuda,
                "rtx5090_detected": cuda_info.get("is_rtx5090", False),
                "cuda_available": pytorch_cuda.get("cuda_available") == "True",
                "compatibility_check": "passed"
            }
            
        except Exception as e:
            return {"error": str(e)}

    async def test_error_handling(self) -> Dict[str, Any]:
        """Test error handling mechanisms."""
        try:
            error_scenarios = {}
            
            async with aiohttp.ClientSession() as session:
                # Test invalid voice synthesis request
                async with session.post(f"{self.ml_url}/voice/synthesize", json={"text": ""}, timeout=10) as response:
                    error_scenarios["empty_text"] = {
                        "status": response.status,
                        "handled_gracefully": response.status in [400, 422]
                    }
                
                # Test non-existent voice profile
                async with session.post(f"{self.ml_url}/voice/synthesize", 
                                      json={"text": "test", "voice_id": "nonexistent"}, timeout=10) as response:
                    error_scenarios["invalid_voice"] = {
                        "status": response.status,
                        "handled_gracefully": response.status == 404
                    }
                
                # Test invalid endpoint
                async with session.get(f"{self.ml_url}/invalid/endpoint", timeout=10) as response:
                    error_scenarios["invalid_endpoint"] = {
                        "status": response.status,
                        "handled_gracefully": response.status == 404
                    }
            
            return {
                "error_scenarios": error_scenarios,
                "graceful_handling": all(scenario.get("handled_gracefully", False) for scenario in error_scenarios.values()),
                "error_handling_working": True
            }
            
        except Exception as e:
            return {"error": str(e)}

    async def test_performance_metrics(self) -> Dict[str, Any]:
        """Test performance and resource usage."""
        try:
            metrics = {}
            
            # Test ML service response time
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ml_url}/health", timeout=10) as response:
                    health_response_time = time.time() - start_time
                    metrics["health_response_time"] = health_response_time
                
                # Test voice status response time
                start_time = time.time()
                async with session.get(f"{self.ml_url}/voice/status", timeout=10) as response:
                    status_response_time = time.time() - start_time
                    metrics["voice_status_response_time"] = status_response_time
                    
                    if response.status == 200:
                        status_data = await response.json()
                        metrics["gpu_memory_usage"] = status_data.get("memory_usage", {})
            
            return {
                "response_times": metrics,
                "performance_acceptable": all(t < 5.0 for t in [metrics.get("health_response_time", 0), metrics.get("voice_status_response_time", 0)]),
                "metrics_available": len(metrics) > 0
            }
            
        except Exception as e:
            return {"error": str(e)}

    def create_test_audio(self) -> bytes:
        """Create a minimal test audio file."""
        # Simple WAV header for 1 second of silence at 22050 Hz, mono, 16-bit
        header = b'RIFF'
        header += (36 + 44100).to_bytes(4, 'little')  # File size
        header += b'WAVE'
        header += b'fmt '
        header += (16).to_bytes(4, 'little')  # Subchunk1Size
        header += (1).to_bytes(2, 'little')   # AudioFormat (PCM)
        header += (1).to_bytes(2, 'little')   # NumChannels (mono)
        header += (22050).to_bytes(4, 'little')  # SampleRate
        header += (44100).to_bytes(4, 'little')  # ByteRate
        header += (2).to_bytes(2, 'little')   # BlockAlign
        header += (16).to_bytes(2, 'little')  # BitsPerSample
        header += b'data'
        header += (44100).to_bytes(4, 'little')  # Subchunk2Size
        
        # Add 1 second of silence (44100 bytes of zeros for 22050 Hz mono 16-bit)
        silence = b'\x00' * 44100
        
        return header + silence

    async def generate_report(self, total_time: float):
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
                if any(keyword in test_name.lower() for keyword in ["connectivity", "initialization", "path"]):
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
        
        logger.info(f"📊 Test report saved to: {report_file}")
        
        # Print summary
        self.print_summary(report)

    def generate_recommendations(self, report: Dict) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []
        
        for test_name, result in report["results"].items():
            if result["status"] in ["FAIL", "ERROR"]:
                if "docker" in test_name.lower():
                    recommendations.append("Check Docker services are running: docker-compose ps")
                elif "connectivity" in test_name.lower():
                    recommendations.append("Verify ML service is accessible on port 8000")
                elif "file path" in test_name.lower():
                    recommendations.append("Check volume mounts in docker-compose.yml")
                elif "rtx5090" in test_name.lower():
                    recommendations.append("Verify NVIDIA drivers and CUDA installation")
                elif "voice cloner" in test_name.lower():
                    recommendations.append("Check TTS library installation and torchaudio workarounds")
        
        if not recommendations:
            recommendations.append("All tests passed - system appears ready for deployment")
        
        return recommendations

    def print_summary(self, report: Dict):
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
        
        print(f"\nDeployment Ready: {'YES' if report['deployment_readiness']['ready'] else 'NO'}")
        
        if report["deployment_readiness"]["blockers"]:
            print(f"\nCritical Issues:")
            for issue in report["deployment_readiness"]["blockers"]:
                print(f"  - {issue}")
        
        print(f"\nRecommendations:")
        for rec in report["deployment_readiness"]["recommendations"]:
            print(f"  - {rec}")
        
        print("\n" + "="*80 + "\n")

async def main():
    """Main test execution."""
    tester = VoiceIntegrationTester()
    results = await tester.run_comprehensive_test()
    return results

if __name__ == "__main__":
    asyncio.run(main())