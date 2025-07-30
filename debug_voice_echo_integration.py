#!/usr/bin/env python3
"""
Debug Voice Echo Integration
Comprehensive testing and troubleshooting tool for the Echo tab voice functionality
"""

import os
import sys
import json
import requests
import subprocess
import time
from pathlib import Path
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VoiceEchoDebugger:
    """Debug tool for Voice Echo integration issues."""
    
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.ml_urls = [
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://ml-inference:8000"
        ]
        self.test_user_email = "lukemoeller@yahoo.com"
        self.session = requests.Session()
        
    def run_full_diagnostic(self):
        """Run complete diagnostic of voice echo system."""
        logger.info("🔍 Starting Voice Echo Integration Diagnostic")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {}
        }
        
        # Test 1: Check web service
        results["tests"]["web_service"] = self.test_web_service()
        
        # Test 2: Check ML services
        results["tests"]["ml_services"] = self.test_ml_services()
        
        # Test 3: Check voice API endpoints
        results["tests"]["voice_apis"] = self.test_voice_apis()
        
        # Test 4: Check user voice data
        results["tests"]["user_voice_data"] = self.check_user_voice_data()
        
        # Test 5: Test voice synthesis pipeline
        results["tests"]["synthesis_pipeline"] = self.test_synthesis_pipeline()
        
        # Test 6: Check Docker services
        results["tests"]["docker_services"] = self.check_docker_services()
        
        # Generate report
        self.generate_diagnostic_report(results)
        
        return results
    
    def test_web_service(self):
        """Test web service availability."""
        logger.info("Testing web service...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/health", timeout=5)
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "response_time": response.elapsed.total_seconds(),
                    "details": "Web service is responding"
                }
            else:
                return {
                    "status": "unhealthy",
                    "http_status": response.status_code,
                    "details": f"Web service returned {response.status_code}"
                }
        except requests.exceptions.RequestException as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "details": "Cannot connect to web service"
            }
    
    def test_ml_services(self):
        """Test ML service availability."""
        logger.info("Testing ML services...")
        
        results = {}
        
        for url in self.ml_urls:
            try:
                response = requests.get(f"{url}/health", timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    results[url] = {
                        "status": "healthy",
                        "response_time": response.elapsed.total_seconds(),
                        "data": data
                    }
                else:
                    results[url] = {
                        "status": "unhealthy",
                        "http_status": response.status_code
                    }
            except requests.exceptions.RequestException as e:
                results[url] = {
                    "status": "unreachable",
                    "error": str(e)
                }
        
        return results
    
    def test_voice_apis(self):
        """Test voice-specific API endpoints."""
        logger.info("Testing voice API endpoints...")
        
        endpoints = [
            "/api/voice/health",
            "/api/voice/upload",
            "/api/voice/train"
        ]
        
        results = {}
        
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                results[endpoint] = {
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "content_type": response.headers.get('content-type', 'unknown')
                }
                
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        results[endpoint]["data"] = response.json()
                    except json.JSONDecodeError:
                        results[endpoint]["data"] = "Invalid JSON response"
                
            except requests.exceptions.RequestException as e:
                results[endpoint] = {
                    "error": str(e),
                    "status": "failed"
                }
        
        return results
    
    def check_user_voice_data(self):
        """Check user voice data availability."""
        logger.info("Checking user voice data...")
        
        user_id = self.test_user_email.replace('@', '_').replace('.', '_')
        voice_dir = Path(f"web/public/voices/{user_id}")
        
        if not voice_dir.exists():
            return {
                "status": "no_data",
                "details": f"Voice directory not found: {voice_dir}"
            }
        
        audio_files = []
        for pattern in ['*.wav', '*.webm', '*.mp3', '*.flac']:
            audio_files.extend(voice_dir.glob(pattern))
        
        metadata_files = list(voice_dir.glob('*_metadata.json'))
        
        return {
            "status": "found" if audio_files else "no_audio",
            "voice_directory": str(voice_dir),
            "audio_files": len(audio_files),
            "metadata_files": len(metadata_files),
            "files": [f.name for f in audio_files[:5]]  # Show first 5 files
        }
    
    def test_synthesis_pipeline(self):
        """Test the complete synthesis pipeline."""
        logger.info("Testing synthesis pipeline...")
        
        test_text = "Hello, this is a test of the voice synthesis system."
        
        try:
            # Test the synthesis API
            response = self.session.post(
                f"{self.base_url}/api/voice/synthesize",
                json={"text": test_text},
                timeout=30
            )
            
            result = {
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds()
            }
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    result["response_data"] = data
                    
                    if data.get("success"):
                        result["status"] = "success"
                        result["audio_url"] = data.get("audioUrl")
                    else:
                        result["status"] = "failed"
                        result["error"] = data.get("error")
                        result["message"] = data.get("message")
                        
                except json.JSONDecodeError:
                    result["status"] = "invalid_response"
                    result["raw_response"] = response.text[:500]
            
            return result
            
        except requests.exceptions.RequestException as e:
            return {
                "status": "network_error",
                "error": str(e)
            }
    
    def check_docker_services(self):
        """Check Docker services status."""
        logger.info("Checking Docker services...")
        
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                return {
                    "status": "available",
                    "containers": result.stdout
                }
            else:
                return {
                    "status": "error",
                    "stderr": result.stderr
                }
                
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            return {
                "status": "unavailable",
                "error": str(e)
            }
    
    def generate_diagnostic_report(self, results):
        """Generate a comprehensive diagnostic report."""
        logger.info("Generating diagnostic report...")
        
        report_file = Path("voice_echo_diagnostic_report.json")
        
        with open(report_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        # Generate human-readable summary
        summary = self.generate_summary(results)
        
        summary_file = Path("voice_echo_diagnostic_summary.txt")
        with open(summary_file, 'w') as f:
            f.write(summary)
        
        logger.info(f"📊 Report saved to: {report_file}")
        logger.info(f"📋 Summary saved to: {summary_file}")
        
        print("\n" + "="*60)
        print("🔍 VOICE ECHO DIAGNOSTIC SUMMARY")
        print("="*60)
        print(summary)
        print("="*60)
    
    def generate_summary(self, results):
        """Generate human-readable summary."""
        summary_lines = []
        
        # Web Service Status
        web_status = results["tests"]["web_service"]["status"]
        summary_lines.append(f"Web Service: {'✅' if web_status == 'healthy' else '❌'} {web_status}")
        
        # ML Services Status
        ml_services = results["tests"]["ml_services"]
        healthy_ml = sum(1 for service in ml_services.values() if service.get("status") == "healthy")
        total_ml = len(ml_services)
        summary_lines.append(f"ML Services: {healthy_ml}/{total_ml} healthy")
        
        # Voice APIs Status
        voice_apis = results["tests"]["voice_apis"]
        working_apis = sum(1 for api in voice_apis.values() if api.get("status_code") in [200, 401])
        total_apis = len(voice_apis)
        summary_lines.append(f"Voice APIs: {working_apis}/{total_apis} responding")
        
        # User Voice Data
        voice_data = results["tests"]["user_voice_data"]
        voice_status = voice_data["status"]
        summary_lines.append(f"Voice Data: {'✅' if voice_status == 'found' else '❌'} {voice_status}")
        if voice_status == "found":
            summary_lines.append(f"  - Audio files: {voice_data['audio_files']}")
            summary_lines.append(f"  - Metadata files: {voice_data['metadata_files']}")
        
        # Synthesis Pipeline
        synthesis = results["tests"]["synthesis_pipeline"]
        synthesis_status = synthesis.get("status", "unknown")
        summary_lines.append(f"Synthesis: {'✅' if synthesis_status == 'success' else '❌'} {synthesis_status}")
        if synthesis_status == "failed":
            summary_lines.append(f"  - Error: {synthesis.get('error', 'Unknown error')}")
        
        # Docker Services
        docker = results["tests"]["docker_services"]
        docker_status = docker["status"]
        summary_lines.append(f"Docker: {'✅' if docker_status == 'available' else '❌'} {docker_status}")
        
        # Recommendations
        summary_lines.append("\n🔧 RECOMMENDATIONS:")
        
        if web_status != "healthy":
            summary_lines.append("- Start the web service: npm run dev")
        
        if healthy_ml == 0:
            summary_lines.append("- Start ML services: docker-compose up ml-inference")
        
        if voice_status != "found":
            summary_lines.append("- Record voice samples using the Voice Clone interface")
        
        if synthesis_status == "failed":
            error = synthesis.get("error", "")
            if "unavailable" in error.lower():
                summary_lines.append("- Check ML service connection and model loading")
            elif "profile" in error.lower():
                summary_lines.append("- Complete voice training or update voice model")
        
        return "\n".join(summary_lines)

def main():
    """Main diagnostic function."""
    debugger = VoiceEchoDebugger()
    
    try:
        results = debugger.run_full_diagnostic()
        
        # Quick test if requested
        if len(sys.argv) > 1 and sys.argv[1] == "quick":
            print("\n🚀 Quick Test Mode - Testing synthesis pipeline...")
            synthesis_result = debugger.test_synthesis_pipeline()
            
            if synthesis_result.get("status") == "success":
                print("✅ Voice synthesis is working!")
                print(f"🎵 Audio URL: {synthesis_result.get('audio_url')}")
            else:
                print(f"❌ Voice synthesis failed: {synthesis_result.get('error')}")
                if synthesis_result.get("message"):
                    print(f"💡 Suggestion: {synthesis_result.get('message')}")
        
        return results
        
    except KeyboardInterrupt:
        logger.info("Diagnostic interrupted by user")
        return None
    except Exception as e:
        logger.error(f"Diagnostic failed: {e}")
        return None

if __name__ == "__main__":
    main()