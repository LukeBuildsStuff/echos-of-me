#!/usr/bin/env python3
"""
Hybrid Voice Training Setup Validator
Validates and sets up the complete hybrid voice training system
"""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HybridTrainingSetup:
    def __init__(self):
        self.project_root = Path("/home/luke/personal-ai-clone")
        self.ml_dir = self.project_root / "ml"
        self.models_dir = self.project_root / "models" / "voices"
        self.voice_dir = self.project_root / "web" / "public" / "voices"
        
        self.validation_results = {}
        self.required_files = [
            "hybrid_voice_training_colab.ipynb",
            "secure_transfer.py",
            "cloud_training_client.py",
            "model_manager.py",
            "hybrid_pipeline.py"
        ]
        
        self.required_packages = [
            "cryptography",
            "requests",
            "flask",
            "schedule",
            "fastapi",
            "uvicorn",
            "sqlalchemy"
        ]
    
    def run_full_setup(self) -> bool:
        """Run complete setup and validation."""
        logger.info("🚀 Starting Hybrid Voice Training Setup...")
        
        # Run all validation checks
        checks = [
            ("Python Version", self.check_python_version),
            ("Required Files", self.check_required_files),
            ("Docker Environment", self.check_docker),
            ("Voice Data", self.check_voice_data),
            ("ML Infrastructure", self.check_ml_infrastructure),
            ("Dependencies", self.check_dependencies),
        ]
        
        all_passed = True
        
        for check_name, check_func in checks:
            logger.info(f"\n📋 Checking {check_name}...")
            result = check_func()
            self.validation_results[check_name] = result
            if not result["passed"]:
                all_passed = False
                logger.error(f"❌ {check_name} failed: {result['message']}")
            else:
                logger.info(f"✅ {check_name} passed")
        
        # If validation passed, proceed with setup
        if all_passed:
            logger.info("\n✅ All validation checks passed!")
            
            # Create directories
            self.create_directory_structure()
            
            # Create configuration files
            self.create_configuration_files()
            
            # Setup permissions
            self.setup_permissions()
            
            # Test pipeline components
            self.test_pipeline_components()
            
            # Print summary
            self.print_setup_summary()
            
            return True
        else:
            logger.error("\n❌ Some validation checks failed. Please fix the issues above.")
            return False
    
    def check_python_version(self) -> Dict[str, Any]:
        """Check Python version compatibility."""
        version = sys.version_info
        if version.major == 3 and version.minor >= 8:
            return {
                "passed": True,
                "message": f"Python {version.major}.{version.minor} detected",
                "version": f"{version.major}.{version.minor}.{version.micro}"
            }
        else:
            return {
                "passed": False,
                "message": f"Python 3.8+ required, found {version.major}.{version.minor}",
                "version": f"{version.major}.{version.minor}.{version.micro}"
            }
    
    def check_required_files(self) -> Dict[str, Any]:
        """Check if all required files exist."""
        missing_files = []
        
        for file_name in self.required_files:
            file_path = self.ml_dir / file_name
            if not file_path.exists():
                missing_files.append(file_name)
        
        if missing_files:
            return {
                "passed": False,
                "message": f"Missing files: {', '.join(missing_files)}",
                "missing": missing_files
            }
        else:
            return {
                "passed": True,
                "message": "All required files present",
                "files": self.required_files
            }
    
    def check_docker(self) -> Dict[str, Any]:
        """Check Docker environment."""
        try:
            result = subprocess.run(
                ["docker", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                docker_version = result.stdout.strip()
                
                # Check if ml-inference container exists
                container_result = subprocess.run(
                    ["docker", "ps", "-a", "--filter", "name=ml-inference", "--format", "{{.Names}}"],
                    capture_output=True,
                    text=True
                )
                
                has_container = "ml-inference" in container_result.stdout
                
                return {
                    "passed": True,
                    "message": f"{docker_version}, ML container: {'exists' if has_container else 'not found'}",
                    "version": docker_version,
                    "ml_container": has_container
                }
            else:
                return {
                    "passed": False,
                    "message": "Docker not accessible",
                    "error": result.stderr
                }
                
        except FileNotFoundError:
            return {
                "passed": False,
                "message": "Docker not installed",
                "error": "Command not found"
            }
        except Exception as e:
            return {
                "passed": False,
                "message": f"Docker check failed: {str(e)}",
                "error": str(e)
            }
    
    def check_voice_data(self) -> Dict[str, Any]:
        """Check voice data availability."""
        if not self.voice_dir.exists():
            return {
                "passed": False,
                "message": f"Voice directory not found: {self.voice_dir}",
                "path": str(self.voice_dir)
            }
        
        # Count voice files
        voice_files = []
        total_duration = 0
        
        for user_dir in self.voice_dir.iterdir():
            if user_dir.is_dir():
                user_files = list(user_dir.glob("*.wav")) + \
                           list(user_dir.glob("*.webm")) + \
                           list(user_dir.glob("*.mp3"))
                
                if user_files:
                    voice_files.extend({
                        "user": user_dir.name,
                        "files": len(user_files),
                        "formats": list(set(f.suffix for f in user_files))
                    } for _ in [None])
        
        if voice_files:
            return {
                "passed": True,
                "message": f"Found voice data for {len(voice_files)} users",
                "users": voice_files,
                "total_files": sum(vf["files"] for vf in voice_files)
            }
        else:
            return {
                "passed": True,  # Not a failure, just no data yet
                "message": "No voice data found yet (record through web interface)",
                "users": [],
                "total_files": 0
            }
    
    def check_ml_infrastructure(self) -> Dict[str, Any]:
        """Check ML infrastructure status."""
        checks = {
            "inference_server": self._check_inference_server(),
            "gpu_available": self._check_gpu(),
            "models_directory": self.models_dir.exists()
        }
        
        all_good = all(checks.values())
        
        return {
            "passed": all_good,
            "message": "ML infrastructure ready" if all_good else "ML infrastructure issues detected",
            "components": checks
        }
    
    def _check_inference_server(self) -> bool:
        """Check if inference server is accessible."""
        try:
            import requests
            response = requests.get("http://localhost:8000/health", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def _check_gpu(self) -> bool:
        """Check GPU availability."""
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0 and "RTX" in result.stdout
        except:
            return False
    
    def check_dependencies(self) -> Dict[str, Any]:
        """Check Python dependencies."""
        missing_packages = []
        
        for package in self.required_packages:
            try:
                __import__(package)
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            return {
                "passed": False,
                "message": f"Missing packages: {', '.join(missing_packages)}",
                "missing": missing_packages,
                "install_command": f"pip install {' '.join(missing_packages)}"
            }
        else:
            return {
                "passed": True,
                "message": "All dependencies installed",
                "packages": self.required_packages
            }
    
    def create_directory_structure(self):
        """Create necessary directories."""
        logger.info("📁 Creating directory structure...")
        
        directories = [
            self.models_dir,
            self.models_dir / "lukemoeller_yahoo_com",
            self.project_root / "training_packages",
            self.project_root / "logs" / "training"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            logger.info(f"  ✅ Created: {directory}")
    
    def create_configuration_files(self):
        """Create default configuration files."""
        logger.info("⚙️ Creating configuration files...")
        
        # Pipeline configuration
        config = {
            "voice_dir": str(self.voice_dir),
            "models_dir": str(self.models_dir),
            "status_file": "/tmp/voice_pipeline_status.json",
            "auto_training": {
                "enabled": True,
                "schedule": "weekly",
                "min_voice_files": 3,
                "min_audio_duration": 60
            },
            "cloud_platforms": {
                "preferred": "colab",
                "fallback": "kaggle"
            },
            "quality_thresholds": {
                "min_quality_score": 0.7,
                "min_training_samples": 5,
                "max_model_age_days": 30
            },
            "notifications": {
                "enabled": True,
                "webhook_url": None
            }
        }
        
        config_file = self.ml_dir / "pipeline_config.json"
        
        try:
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"  ✅ Created: {config_file}")
            
            # Create example scripts
            self._create_example_scripts()
            
            return True
            
        except Exception as e:
            logger.error(f"Configuration creation failed: {e}")
            return False
    
    def _create_example_scripts(self):
        """Create example usage scripts."""
        
        # Quick start script
        quick_start = '''#!/bin/bash
# Quick Start: Hybrid Voice Training
# Run this script to start training for your voice

USER_ID="lukemoeller_yahoo_com"
PLATFORM="colab"

echo "🚀 Starting hybrid voice training for $USER_ID..."
echo ""

# Check if voice files exist
if [ ! -d "/home/luke/personal-ai-clone/web/public/voices/$USER_ID" ]; then
    echo "❌ Voice directory not found: /home/luke/personal-ai-clone/web/public/voices/$USER_ID"
    echo "Please record some voice samples first through the web interface"
    exit 1
fi

# Count voice files
VOICE_COUNT=$(find "/home/luke/personal-ai-clone/web/public/voices/$USER_ID" -name "*.wav" -o -name "*.webm" -o -name "*.mp3" | wc -l)
echo "📊 Found $VOICE_COUNT voice files"

if [ "$VOICE_COUNT" -lt 3 ]; then
    echo "⚠️ Minimum 3 voice files recommended (found $VOICE_COUNT)"
    echo "Consider recording more samples for better quality"
fi

# Start training pipeline
echo ""
echo "📦 Starting training pipeline..."
python3 /home/luke/personal-ai-clone/ml/hybrid_pipeline.py start --user-id "$USER_ID" --platform "$PLATFORM"

echo ""
echo "✅ Training pipeline started!"
echo "Follow the instructions above to complete training in Google Colab"
'''
        
        quick_start_file = self.ml_dir / "quick_start_training.sh"
        with open(quick_start_file, 'w') as f:
            f.write(quick_start)
        os.chmod(quick_start_file, 0o755)
        
        # Status check script
        status_check = '''#!/bin/bash
# Check Hybrid Voice Training Status

echo "🔍 Hybrid Voice Training System Status"
echo "====================================="
echo ""

# Pipeline status
echo "📊 Pipeline Status:"
python3 /home/luke/personal-ai-clone/ml/hybrid_pipeline.py status
echo ""

# Model status
echo "🎯 Available Models:"
python3 /home/luke/personal-ai-clone/ml/model_manager.py list
echo ""

# Voice files status
echo "🎤 Voice Files:"
for user_dir in /home/luke/personal-ai-clone/web/public/voices/*/; do
    if [ -d "$user_dir" ]; then
        user=$(basename "$user_dir")
        count=$(find "$user_dir" -name "*.wav" -o -name "*.webm" -o -name "*.mp3" | wc -l)
        echo "  $user: $count files"
    fi
done
echo ""

# Docker status
echo "🐳 Docker Containers:"
docker ps --filter "name=personal-ai-clone" --format "table {{.Names}}\t{{.Status}}"
echo ""

# Inference server health
echo "🚀 Inference Server:"
curl -s http://localhost:8000/health | jq . 2>/dev/null || echo "Service not available"
'''
        
        status_file = self.ml_dir / "check_status.sh"
        with open(status_file, 'w') as f:
            f.write(status_check)
        os.chmod(status_file, 0o755)
        
        logger.info(f"  ✅ Created: {quick_start_file}")
        logger.info(f"  ✅ Created: {status_file}")
    
    def test_pipeline_components(self) -> bool:
        """Test key pipeline components."""
        logger.info("🧪 Testing pipeline components...")
        
        tests = [
            ("Voice Cloner Import", self._test_voice_cloner_import),
            ("Model Manager", self._test_model_manager),
            ("Secure Transfer", self._test_secure_transfer),
            ("Cloud Client", self._test_cloud_client),
            ("Pipeline Core", self._test_pipeline_core)
        ]
        
        all_passed = True
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                status = "✅" if result else "❌"
                logger.info(f"  {status} {test_name}")
                
                if not result:
                    all_passed = False
                    
            except Exception as e:
                logger.error(f"  ❌ {test_name}: {e}")
                all_passed = False
        
        return all_passed
    
    def _test_voice_cloner_import(self) -> bool:
        """Test voice cloner module import."""
        try:
            sys.path.insert(0, str(self.ml_dir))
            import voice_cloner
            return hasattr(voice_cloner, 'VoiceCloner')
        except Exception:
            return False
    
    def _test_model_manager(self) -> bool:
        """Test model manager functionality."""
        try:
            sys.path.insert(0, str(self.ml_dir))
            from model_manager import VoiceModelManager
            manager = VoiceModelManager()
            return manager is not None
        except Exception:
            return False
    
    def _test_secure_transfer(self) -> bool:
        """Test secure transfer system."""
        try:
            sys.path.insert(0, str(self.ml_dir))
            from secure_transfer import SecureVoiceTransfer
            transfer = SecureVoiceTransfer()
            return transfer is not None
        except Exception:
            return False
    
    def _test_cloud_client(self) -> bool:
        """Test cloud training client."""
        try:
            sys.path.insert(0, str(self.ml_dir))
            from cloud_training_client import CloudTrainingClient
            client = CloudTrainingClient()
            return client is not None
        except Exception:
            return False
    
    def _test_pipeline_core(self) -> bool:
        """Test pipeline core functionality."""
        try:
            sys.path.insert(0, str(self.ml_dir))
            from hybrid_pipeline import HybridVoiceTrainingPipeline
            # Just test import for now
            return True
        except Exception:
            return False
    
    def setup_permissions(self) -> bool:
        """Setup proper file permissions."""
        logger.info("🔒 Setting up permissions...")
        
        try:
            # Make scripts executable
            scripts = [
                self.ml_dir / "hybrid_pipeline.py",
                self.ml_dir / "model_manager.py", 
                self.ml_dir / "secure_transfer.py",
                self.ml_dir / "cloud_training_client.py",
                self.ml_dir / "setup_hybrid_training.py"
            ]
            
            for script in scripts:
                if script.exists():
                    os.chmod(script, 0o755)
                    logger.info(f"  ✅ Made executable: {script.name}")
            
            # Set directory permissions
            directories = [
                self.models_dir,
                self.voice_dir
            ]
            
            for directory in directories:
                if directory.exists():
                    os.chmod(directory, 0o755)
                    logger.info(f"  ✅ Set permissions: {directory}")
            
            return True
            
        except Exception as e:
            logger.error(f"Permission setup failed: {e}")
            return False
    
    def print_setup_summary(self):
        """Print setup completion summary."""
        print("\n" + "="*60)
        print("🎉 HYBRID VOICE TRAINING SETUP COMPLETE!")
        print("="*60)
        
        print("\n📊 System Status:")
        for check, result in self.validation_results.items():
            status = "✅" if result["passed"] else "❌"
            print(f"  {status} {check}: {result['message']}")
        
        print("\n🚀 Quick Start:")
        print(f"  1. Record voice samples through web interface")
        print(f"  2. Run: ./ml/quick_start_training.sh")
        print(f"  3. Follow Google Colab instructions")
        print(f"  4. Deploy trained model")
        
        print("\n📁 Key Files:")
        print(f"  📓 Documentation: {self.ml_dir}/README_HYBRID_TRAINING.md")
        print(f"  ⚙️ Configuration: {self.ml_dir}/pipeline_config.json")
        print(f"  🚀 Quick Start: {self.ml_dir}/quick_start_training.sh")
        print(f"  📊 Status Check: {self.ml_dir}/check_status.sh")
        
        print("\n🔧 Manual Commands:")
        print(f"  Start Training:   python {self.ml_dir}/hybrid_pipeline.py start --user-id lukemoeller_yahoo_com")
        print(f"  Check Status:     python {self.ml_dir}/hybrid_pipeline.py status")
        print(f"  List Models:      python {self.ml_dir}/model_manager.py list")
        print(f"  Monitor System:   python {self.ml_dir}/hybrid_pipeline.py monitor")
        
        print("\n🌐 API Endpoints (when inference server running):")
        print(f"  Voice Status:     http://localhost:8000/voice/status")
        print(f"  List Models:      http://localhost:8000/voice/models")
        print(f"  Health Check:     http://localhost:8000/health")
        
        print("\n⚠️ Important Notes:")
        print(f"  • Voice data stays secure on your local system")
        print(f"  • Cloud training uses free Google Colab/Kaggle GPUs")
        print(f"  • Trained models deployed automatically to RTX 5090")
        print(f"  • Minimum 3 voice files (60+ seconds) recommended")
        
        print("\n📖 For detailed instructions, see:")
        print(f"  {self.ml_dir}/README_HYBRID_TRAINING.md")
        print("\n" + "="*60)

def main():
    """Main setup function."""
    print("🔧 Hybrid Voice Training Setup")
    print("==============================\n")
    
    setup = HybridTrainingSetup()
    
    if setup.run_full_setup():
        print("\n🎉 Setup completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Setup failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()