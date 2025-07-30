"""
RTX 5090 Inference Server Monitoring and Debugging Tool
Real-time monitoring of GPU usage, memory, and model performance
"""

import time
import json
import requests
from typing import Dict, Any, List
import torch
import psutil
from pathlib import Path

class RTX5090Monitor:
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.log_file = Path("/workspace/inference_monitor.log")
        
    def check_server_health(self) -> Dict[str, Any]:
        """Check if the inference server is healthy."""
        try:
            response = requests.get(f"{self.server_url}/health", timeout=5)
            return {
                "healthy": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else None,
                "status_code": response.status_code
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "status_code": None
            }
    
    def get_server_status(self) -> Dict[str, Any]:
        """Get detailed server status."""
        try:
            response = requests.get(f"{self.server_url}/status", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Status check failed: {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics."""
        metrics = {
            "timestamp": time.time(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "total_gb": psutil.virtual_memory().total / 1e9,
                "available_gb": psutil.virtual_memory().available / 1e9,
                "percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total_gb": psutil.disk_usage('/').total / 1e9,
                "free_gb": psutil.disk_usage('/').free / 1e9,
                "percent": psutil.disk_usage('/').percent
            }
        }
        
        # GPU metrics
        if torch.cuda.is_available():
            metrics["gpu"] = {
                "name": torch.cuda.get_device_name(0),
                "capability": torch.cuda.get_device_capability(0),
                "memory_allocated_gb": torch.cuda.memory_allocated() / 1e9,
                "memory_reserved_gb": torch.cuda.memory_reserved() / 1e9,
                "memory_total_gb": torch.cuda.get_device_properties(0).total_memory / 1e9
            }
        
        return metrics
    
    def test_inference(self, test_message: str = "Hello, how are you?") -> Dict[str, Any]:
        """Test inference endpoint."""
        try:
            payload = {
                "message": test_message,
                "user_context": "You are a helpful AI assistant.",
                "max_length": 100,
                "temperature": 0.7
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.server_url}/chat",
                json=payload,
                timeout=30
            )
            end_time = time.time()
            
            if response.status_code == 200:
                result = response.json()
                result["test_response_time"] = end_time - start_time
                return {"success": True, "result": result}
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get list of available models."""
        try:
            response = requests.get(f"{self.server_url}/models/available", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Failed to get models: {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    def cleanup_memory(self) -> Dict[str, Any]:
        """Force memory cleanup on the server."""
        try:
            response = requests.post(f"{self.server_url}/memory/cleanup", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Cleanup failed: {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    def comprehensive_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check."""
        print("🔍 Running RTX 5090 Inference Server Health Check...")
        
        results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "server_health": self.check_server_health(),
            "system_metrics": self.get_system_metrics(),
            "server_status": self.get_server_status(),
            "available_models": self.get_available_models(),
            "inference_test": self.test_inference()
        }
        
        # Log results
        self.log_results(results)
        
        return results
    
    def log_results(self, results: Dict[str, Any]):
        """Log monitoring results to file."""
        try:
            with open(self.log_file, 'a') as f:
                f.write(json.dumps(results, indent=2) + "\n" + "="*80 + "\n")
        except Exception as e:
            print(f"Failed to write log: {e}")
    
    def print_summary(self, results: Dict[str, Any]):
        """Print a human-readable summary."""
        print("\n" + "="*60)
        print("RTX 5090 INFERENCE SERVER HEALTH SUMMARY")
        print("="*60)
        
        # Server Health
        health = results["server_health"]
        status = "✅ HEALTHY" if health["healthy"] else "❌ UNHEALTHY"
        print(f"Server Status: {status}")
        
        if not health["healthy"]:
            print(f"Error: {health.get('error', 'Unknown error')}")
            return
        
        # System Metrics
        sys_metrics = results["system_metrics"]
        print(f"CPU Usage: {sys_metrics['cpu_percent']:.1f}%")
        print(f"RAM Usage: {sys_metrics['memory']['percent']:.1f}% ({sys_metrics['memory']['available_gb']:.1f}GB free)")
        
        if "gpu" in sys_metrics:
            gpu = sys_metrics["gpu"]
            memory_used = gpu["memory_allocated_gb"]
            memory_total = gpu["memory_total_gb"]
            memory_percent = (memory_used / memory_total) * 100 if memory_total > 0 else 0
            print(f"GPU: {gpu['name']}")
            print(f"GPU Memory: {memory_percent:.1f}% ({memory_used:.1f}GB / {memory_total:.1f}GB)")
            print(f"CUDA Capability: {gpu['capability']}")
        
        # Server Status
        server_status = results["server_status"]
        if "error" not in server_status:
            print(f"Model Loaded: {'✅' if server_status.get('model_loaded') else '❌'}")
            print(f"Current Model: {server_status.get('model_name', 'None')}")
            print(f"Available Models: {len(server_status.get('available_models', []))}")
        
        # Inference Test
        inference = results["inference_test"]
        if inference["success"]:
            result = inference["result"]
            print(f"Inference Test: ✅ SUCCESS")
            print(f"Response Time: {result.get('test_response_time', 0):.2f}s")
            print(f"Generation Time: {result.get('generation_time', 0):.2f}s")
            print(f"Confidence: {result.get('confidence', 0):.2f}")
            print(f"Response: {result.get('response', '')[:100]}...")
        else:
            print(f"Inference Test: ❌ FAILED")
            print(f"Error: {inference.get('error', 'Unknown error')}")
        
        print("="*60)
    
    def monitor_continuously(self, interval: int = 30):
        """Monitor the server continuously."""
        print(f"🔄 Starting continuous monitoring (interval: {interval}s)")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                results = self.comprehensive_health_check()
                self.print_summary(results)
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")

def main():
    """Main monitoring function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="RTX 5090 Inference Server Monitor")
    parser.add_argument("--url", default="http://localhost:8000", help="Server URL")
    parser.add_argument("--continuous", "-c", action="store_true", help="Run continuous monitoring")
    parser.add_argument("--interval", "-i", type=int, default=30, help="Monitoring interval in seconds")
    parser.add_argument("--test-only", "-t", action="store_true", help="Run inference test only")
    parser.add_argument("--cleanup", action="store_true", help="Force memory cleanup")
    
    args = parser.parse_args()
    
    monitor = RTX5090Monitor(args.url)
    
    if args.cleanup:
        print("🧹 Forcing memory cleanup...")
        result = monitor.cleanup_memory()
        print(json.dumps(result, indent=2))
        return
    
    if args.test_only:
        print("🧪 Running inference test...")
        result = monitor.test_inference()
        print(json.dumps(result, indent=2))
        return
    
    if args.continuous:
        monitor.monitor_continuously(args.interval)
    else:
        results = monitor.comprehensive_health_check()
        monitor.print_summary(results)

if __name__ == "__main__":
    main()