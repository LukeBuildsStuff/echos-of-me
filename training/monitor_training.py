#!/usr/bin/env python3
"""
RTX 5090 Training Monitor
Real-time monitoring of training progress and GPU utilization
"""

import time
import json
import psutil
import psycopg2
import subprocess
import torch
from datetime import datetime
from typing import Dict, Optional

class RTX5090Monitor:
    """Monitor RTX 5090 training performance"""
    
    def __init__(self):
        self.start_time = datetime.now()
        
    def get_gpu_stats(self) -> Dict:
        """Get RTX 5090 GPU statistics"""
        if not torch.cuda.is_available():
            return {"error": "CUDA not available"}
            
        try:
            # Get GPU memory usage
            memory_allocated = torch.cuda.memory_allocated(0) / (1024**3)
            memory_reserved = torch.cuda.memory_reserved(0) / (1024**3)
            memory_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            
            # Get GPU utilization via nvidia-smi
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=utilization.gpu,temperature.gpu,power.draw", "--format=csv,noheader,nounits"],
                capture_output=True, text=True
            )
            
            if result.returncode == 0:
                gpu_util, temp, power = result.stdout.strip().split(", ")
                gpu_utilization = int(gpu_util)
                gpu_temperature = int(temp)
                gpu_power = float(power)
            else:
                gpu_utilization = 0
                gpu_temperature = 0
                gpu_power = 0.0
                
            return {
                "memory_allocated_gb": round(memory_allocated, 2),
                "memory_reserved_gb": round(memory_reserved, 2),
                "memory_total_gb": round(memory_total, 2),
                "memory_utilization_percent": round((memory_allocated / memory_total) * 100, 1),
                "gpu_utilization_percent": gpu_utilization,
                "temperature_c": gpu_temperature,
                "power_draw_w": gpu_power,
                "device_name": torch.cuda.get_device_name(0),
                "device_capability": torch.cuda.get_device_capability(0)
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    def get_training_status(self) -> Optional[Dict]:
        """Get current training status from database"""
        try:
            conn = psycopg2.connect(
                host="localhost",
                port=5432,
                database="echosofme_dev",
                user="echosofme",
                password="secure_dev_password"
            )
            
            cursor = conn.cursor()
            
            # Get most recent training run
            query = """
            SELECT id, status, progress, created_at, updated_at
            FROM training_runs 
            ORDER BY created_at DESC 
            LIMIT 1;
            """
            
            cursor.execute(query)
            result = cursor.fetchone()
            
            if result:
                training_id, status, progress, created_at, updated_at = result
                return {
                    "id": training_id,
                    "status": status,
                    "progress": progress or 0.0,
                    "created_at": created_at.isoformat(),
                    "updated_at": updated_at.isoformat() if updated_at else None,
                    "duration_minutes": (datetime.now() - created_at).total_seconds() / 60
                }
            
            return None
            
        except Exception as e:
            return {"error": str(e)}
        finally:
            if 'conn' in locals():
                conn.close()
                
    def get_system_stats(self) -> Dict:
        """Get system resource usage"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "uptime_hours": (datetime.now() - self.start_time).total_seconds() / 3600
        }
        
    def print_status(self):
        """Print comprehensive training status"""
        print("\n" + "="*80)
        print(f"🚀 RTX 5090 Training Monitor - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        # Training status
        training_status = self.get_training_status()
        if training_status and "error" not in training_status:
            print(f"📊 Training Status: {training_status['status'].upper()}")
            print(f"📈 Progress: {training_status['progress']:.1f}%")
            print(f"⏱️  Duration: {training_status['duration_minutes']:.1f} minutes")
            print(f"🆔 Job ID: {training_status['id']}")
        else:
            print("❌ No active training found")
            
        print()
        
        # GPU stats
        gpu_stats = self.get_gpu_stats()
        if "error" not in gpu_stats:
            print(f"🎮 GPU: {gpu_stats['device_name']}")
            print(f"📺 Architecture: sm_{gpu_stats['device_capability'][0]}{gpu_stats['device_capability'][1]}")
            print(f"💾 VRAM: {gpu_stats['memory_allocated_gb']:.1f}GB / {gpu_stats['memory_total_gb']:.1f}GB ({gpu_stats['memory_utilization_percent']:.1f}%)")
            print(f"⚡ GPU Utilization: {gpu_stats['gpu_utilization_percent']}%")
            print(f"🌡️  Temperature: {gpu_stats['temperature_c']}°C")
            print(f"🔌 Power Draw: {gpu_stats['power_draw_w']}W")
        else:
            print(f"❌ GPU Error: {gpu_stats['error']}")
            
        print()
        
        # System stats
        system_stats = self.get_system_stats()
        print(f"💻 CPU: {system_stats['cpu_percent']}%")
        print(f"🧠 RAM: {system_stats['memory_percent']}%")
        print(f"💽 Disk: {system_stats['disk_usage_percent']}%")
        
        print("="*80)
        
    def monitor_continuous(self, interval_seconds: int = 30):
        """Continuously monitor training"""
        print("🔍 Starting continuous RTX 5090 training monitoring...")
        print(f"📊 Update interval: {interval_seconds} seconds")
        print("Press Ctrl+C to stop monitoring")
        
        try:
            while True:
                self.print_status()
                time.sleep(interval_seconds)
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")
            
    def export_stats(self) -> Dict:
        """Export all stats as JSON"""
        return {
            "timestamp": datetime.now().isoformat(),
            "training": self.get_training_status(),
            "gpu": self.get_gpu_stats(),
            "system": self.get_system_stats()
        }

def main():
    """Main monitoring function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="RTX 5090 Training Monitor")
    parser.add_argument("--continuous", "-c", action="store_true", help="Continuous monitoring")
    parser.add_argument("--interval", "-i", type=int, default=30, help="Update interval in seconds")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    monitor = RTX5090Monitor()
    
    if args.continuous:
        monitor.monitor_continuous(args.interval)
    elif args.json:
        stats = monitor.export_stats()
        print(json.dumps(stats, indent=2))
    else:
        monitor.print_status()

if __name__ == "__main__":
    main()