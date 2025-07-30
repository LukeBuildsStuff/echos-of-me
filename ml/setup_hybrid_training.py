#!/usr/bin/env python3
"""
Hybrid Voice Training Setup and Validation Script
Validates system requirements and sets up the hybrid training pipeline
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List, Tuple
import logging
import platform
import requests
import tempfile

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HybridTrainingSetup:
    def __init__(self):
        self.base_dir = Path("/home/luke/personal-ai-clone")
        self.ml_dir = self.base_dir / "ml"
        self.voice_dir = self.base_dir / "web" / "public" / "voices"
        self.models_dir = Path("/models/voices")
        
        self.requirements = [
            "torch",
            "torchaudio", 
            "transformers",
            "TTS",
            "soundfile",
            "librosa",
            "cryptography",
            "requests",
            "flask",
            "schedule",
            "fastapi",
            "uvicorn"
        ]
        
        self.validation_results = {}
    
    def run_full_setup(self) -> bool:
        """Run complete setup and validation."""
        logger.info("🚀 Starting Hybrid Voice Training Setup...")
        
        try:
            # Step 1: System validation
            if not self.validate_system():
                logger.error("❌ System validation failed")
                return False
            
            # Step 2: Setup directories
            if not self.setup_directories():
                logger.error("❌ Directory setup failed")
                return False
            
            # Step 3: Install dependencies
            if not self.install_dependencies():
                logger.error("❌ Dependency installation failed")
                return False
            
            # Step 4: Validate existing setup
            if not self.validate_existing_setup():
                logger.error("❌ Existing setup validation failed")
                return False
            
            # Step 5: Create configuration
            if not self.create_configuration():
                logger.error("❌ Configuration creation failed")
                return False
            
            # Step 6: Test pipeline components
            if not self.test_pipeline_components():
                logger.error("❌ Pipeline component testing failed")
                return False
            
            # Step 7: Setup permissions
            if not self.setup_permissions():
                logger.error("❌ Permission setup failed")
                return False
            
            logger.info("✅ Hybrid Voice Training Setup completed successfully!")
            self.print_setup_summary()
            return True
            
        except Exception as e:
            logger.error(f"Setup failed with error: {e}")
            return False
    
    def validate_system(self) -> bool:
        """Validate system requirements."""
        logger.info("🔍 Validating system requirements...")
        
        validation_checks = [
            ("Operating System", self._check_os),
            ("Python Version", self._check_python),
            ("CUDA Availability", self._check_cuda),
            ("Docker", self._check_docker),
            ("Git", self._check_git),
            ("Internet Connection", self._check_internet),
            ("Disk Space", self._check_disk_space),
            ("Permissions", self._check_permissions)
        ]
        
        all_passed = True
        
        for check_name, check_func in validation_checks:
            try:
                result = check_func()
                status = "✅" if result["passed"] else "❌"
                logger.info(f"  {status} {check_name}: {result['message']}")
                
                self.validation_results[check_name] = result
                
                if not result["passed"] and result.get("critical", True):
                    all_passed = False
                    
            except Exception as e:
                logger.error(f"  ❌ {check_name}: Check failed - {e}")
                all_passed = False
        
        return all_passed
    
    def _check_os(self) -> Dict[str, Any]:
        """Check operating system compatibility."""
        os_name = platform.system()
        if os_name == "Linux":
            return {"passed": True, "message": f"Linux detected: {platform.release()}"}
        else:
            return {"passed": False, "message": f"Unsupported OS: {os_name}"}
    
    def _check_python(self) -> Dict[str, Any]:
        """Check Python version."""
        version = sys.version_info
        if version.major == 3 and version.minor >= 8:
            return {"passed": True, "message": f"Python {version.major}.{version.minor}.{version.micro}"}
        else:
            return {"passed": False, "message": f"Python 3.8+ required, found {version.major}.{version.minor}"}
    
    def _check_cuda(self) -> Dict[str, Any]:
        """Check CUDA availability."""
        try:
            import torch
            if torch.cuda.is_available():
                device_name = torch.cuda.get_device_name(0)
                memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
                return {
                    "passed": True, 
                    "message": f"CUDA available: {device_name} ({memory_gb:.1f}GB)"
                }
            else:
                return {"passed": False, "message": "CUDA not available"}
        except ImportError:
            return {"passed": False, "message": "PyTorch not installed"}
    
    def _check_docker(self) -> Dict[str, Any]:
        """Check Docker availability."""
        try:
            result = subprocess.run(["docker", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                return {"passed": True, "message": result.stdout.strip()}
            else:
                return {"passed": False, "message": "Docker not accessible"}
        except FileNotFoundError:
            return {"passed": False, "message": "Docker not installed"}
    
    def _check_git(self) -> Dict[str, Any]:
        """Check Git availability."""
        try:
            result = subprocess.run(["git", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                return {"passed": True, "message": result.stdout.strip()}
            else:
                return {"passed": False, "message": "Git not accessible", "critical": False}
        except FileNotFoundError:
            return {"passed": False, "message": "Git not installed", "critical": False}
    
    def _check_internet(self) -> Dict[str, Any]:
        """Check internet connectivity."""
        try:
            response = requests.get("https://google.com", timeout=5)
            if response.status_code == 200:
                return {"passed": True, "message": "Internet connection available"}
            else:
                return {"passed": False, "message": "Internet connection issues"}
        except Exception:
            return {"passed": False, "message": "No internet connection"}
    
    def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space."""
        try:
            statvfs = os.statvfs("/")
            free_gb = (statvfs.f_bavail * statvfs.f_frsize) / (1024**3)
            
            if free_gb >= 10:
                return {"passed": True, "message": f"{free_gb:.1f}GB available"}
            else:
                return {"passed": False, "message": f"Only {free_gb:.1f}GB free (10GB+ required)"}
        except Exception as e:
            return {"passed": False, "message": f"Could not check disk space: {e}"}
    
    def _check_permissions(self) -> Dict[str, Any]:
        """Check file system permissions."""
        test_paths = [
            self.base_dir,
            Path("/models"),
            Path("/tmp")
        ]
        
        for path in test_paths:
            if path.exists() and not os.access(path, os.W_OK):
                return {"passed": False, "message": f"No write access to {path}"}
        
        return {"passed": True, "message": "Filesystem permissions OK"}
    
    def setup_directories(self) -> bool:
        """Setup required directory structure."""
        logger.info("📁 Setting up directory structure...")
        
        directories = [
            self.models_dir,
            self.models_dir / "voices",
            Path("/tmp/voice_training"),
            self.ml_dir / "logs"
        ]
        
        try:
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"  ✅ Created: {directory}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create directories: {e}")
            return False
    
    def install_dependencies(self) -> bool:
        """Install required Python packages."""
        logger.info("📦 Installing Python dependencies...")
        
        try:
            # Check which packages are missing
            missing_packages = []
            
            for package in self.requirements:
                try:
                    __import__(package.replace("-", "_"))
                    logger.info(f"  ✅ {package} already installed")
                except ImportError:
                    missing_packages.append(package)
                    logger.info(f"  📦 {package} needs installation")
            
            if missing_packages:
                logger.info(f"Installing {len(missing_packages)} missing packages...")
                
                # Install missing packages
                cmd = [sys.executable, "-m", "pip", "install"] + missing_packages
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    logger.info("✅ All dependencies installed successfully")
                else:
                    logger.error(f"Dependency installation failed: {result.stderr}")
                    return False
            else:
                logger.info("✅ All dependencies already satisfied")
            
            return True
            
        except Exception as e:
            logger.error(f"Dependency installation error: {e}")
            return False
    
    def validate_existing_setup(self) -> bool:
        """Validate existing Personal AI Clone setup."""
        logger.info("🔍 Validating existing setup...")
        
        checks = [
            ("Voice directory", self.voice_dir.exists()),
            ("Docker compose file", (self.base_dir / "docker-compose.yml").exists()),
            ("ML directory", self.ml_dir.exists()),
            ("Voice cloner script", (self.ml_dir / "voice_cloner.py").exists()),
            ("Inference server", (self.ml_dir / "inference_server.py").exists())
        ]
        
        all_passed = True
        
        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            logger.info(f"  {status} {check_name}")
            if not passed:
                all_passed = False
        
        # Check if Docker containers are running
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=personal-ai-clone", "--format", "{{.Names}}"],
                capture_output=True, text=True
            )
            
            if result.returncode == 0:
                containers = result.stdout.strip().split('\n') if result.stdout.strip() else []
                if containers:
                    logger.info(f"  ✅ Docker containers running: {', '.join(containers)}")
                else:
                    logger.info("  ⚠️ No Personal AI Clone containers running")
            
        except Exception as e:
            logger.warning(f"Could not check Docker containers: {e}")
        
        return all_passed
    
    def create_configuration(self) -> bool:
        """Create default configuration files."""
        logger.info("⚙️ Creating configuration files...")
        
        # Pipeline configuration
        config = {\n            "voice_dir": str(self.voice_dir),\n            "models_dir": str(self.models_dir),\n            "status_file": "/tmp/voice_pipeline_status.json",\n            "auto_training": {\n                "enabled": True,\n                "schedule": "weekly",\n                "min_voice_files": 3,\n                "min_audio_duration": 60\n            },\n            "cloud_platforms": {\n                "preferred": "colab",\n                "fallback": "kaggle"\n            },\n            "quality_thresholds": {\n                "min_quality_score": 0.7,\n                "min_training_samples": 5,\n                "max_model_age_days": 30\n            },\n            "notifications": {\n                "enabled": True,\n                "webhook_url": None\n            }\n        }\n        \n        config_file = self.ml_dir / "pipeline_config.json"\n        \n        try:\n            with open(config_file, 'w') as f:\n                json.dump(config, f, indent=2)\n            \n            logger.info(f"  ✅ Created: {config_file}")\n            \n            # Create example scripts\n            self._create_example_scripts()\n            \n            return True\n            \n        except Exception as e:\n            logger.error(f"Configuration creation failed: {e}")\n            return False\n    \n    def _create_example_scripts(self):\n        """Create example usage scripts.\"\"\"\n        \n        # Quick start script\n        quick_start = '''\n#!/bin/bash\n# Quick Start: Hybrid Voice Training\n# Run this script to start training for your voice\n\nUSER_ID="lukemoeller_yahoo_com"\nPLATFORM="colab"\n\necho "🚀 Starting hybrid voice training for $USER_ID..."\necho ""\n\n# Check if voice files exist\nif [ ! -d "/home/luke/personal-ai-clone/web/public/voices/$USER_ID" ]; then\n    echo "❌ Voice directory not found: /home/luke/personal-ai-clone/web/public/voices/$USER_ID"\n    echo "Please record some voice samples first through the web interface"\n    exit 1\nfi\n\n# Count voice files\nVOICE_COUNT=$(find "/home/luke/personal-ai-clone/web/public/voices/$USER_ID" -name "*.wav" -o -name "*.webm" -o -name "*.mp3" | wc -l)\necho "📊 Found $VOICE_COUNT voice files"\n\nif [ "$VOICE_COUNT" -lt 3 ]; then\n    echo "⚠️ Minimum 3 voice files recommended (found $VOICE_COUNT)"\n    echo "Consider recording more samples for better quality"\nfi\n\n# Start training pipeline\necho ""\necho "📦 Starting training pipeline..."\npython3 /home/luke/personal-ai-clone/ml/hybrid_pipeline.py start --user-id "$USER_ID" --platform "$PLATFORM"\n\necho ""\necho "✅ Training pipeline started!"\necho "Follow the instructions above to complete training in Google Colab"\n'''\n        \n        quick_start_file = self.ml_dir / "quick_start_training.sh"\n        with open(quick_start_file, 'w') as f:\n            f.write(quick_start)\n        os.chmod(quick_start_file, 0o755)\n        \n        # Status check script\n        status_check = '''\n#!/bin/bash\n# Check Hybrid Voice Training Status\n\necho "🔍 Hybrid Voice Training System Status"\necho "====================================="\necho ""\n\n# Pipeline status\necho "📊 Pipeline Status:"\npython3 /home/luke/personal-ai-clone/ml/hybrid_pipeline.py status\necho ""\n\n# Model status\necho "🎯 Available Models:"\npython3 /home/luke/personal-ai-clone/ml/model_manager.py list\necho ""\n\n# Voice files status\necho "🎤 Voice Files:"\nfor user_dir in /home/luke/personal-ai-clone/web/public/voices/*/; do\n    if [ -d "$user_dir" ]; then\n        user=$(basename "$user_dir")\n        count=$(find "$user_dir" -name "*.wav" -o -name "*.webm" -o -name "*.mp3" | wc -l)\n        echo "  $user: $count files"\n    fi\ndone\necho ""\n\n# Docker status\necho "🐳 Docker Containers:"\ndocker ps --filter "name=personal-ai-clone" --format "table {{.Names}}\\t{{.Status}}"\necho ""\n\n# Inference server health\necho "🚀 Inference Server:"\ncurl -s http://localhost:8000/health | jq . 2>/dev/null || echo "Service not available"\n'''\n        \n        status_file = self.ml_dir / "check_status.sh"\n        with open(status_file, 'w') as f:\n            f.write(status_check)\n        os.chmod(status_file, 0o755)\n        \n        logger.info(f"  ✅ Created: {quick_start_file}")\n        logger.info(f"  ✅ Created: {status_file}")\n    \n    def test_pipeline_components(self) -> bool:\n        """Test key pipeline components."""\n        logger.info("🧪 Testing pipeline components...")\n        \n        tests = [\n            ("Voice Cloner Import", self._test_voice_cloner_import),\n            ("Model Manager", self._test_model_manager),\n            ("Secure Transfer", self._test_secure_transfer),\n            ("Cloud Client", self._test_cloud_client),\n            ("Pipeline Core", self._test_pipeline_core)\n        ]\n        \n        all_passed = True\n        \n        for test_name, test_func in tests:\n            try:\n                result = test_func()\n                status = "✅" if result else "❌"\n                logger.info(f"  {status} {test_name}")\n                \n                if not result:\n                    all_passed = False\n                    \n            except Exception as e:\n                logger.error(f"  ❌ {test_name}: {e}")\n                all_passed = False\n        \n        return all_passed\n    \n    def _test_voice_cloner_import(self) -> bool:\n        """Test voice cloner module import."""\n        try:\n            sys.path.insert(0, str(self.ml_dir))\n            import voice_cloner\n            return hasattr(voice_cloner, 'VoiceCloner')\n        except Exception:\n            return False\n    \n    def _test_model_manager(self) -> bool:\n        """Test model manager functionality."""\n        try:\n            sys.path.insert(0, str(self.ml_dir))\n            from model_manager import VoiceModelManager\n            manager = VoiceModelManager()\n            return manager is not None\n        except Exception:\n            return False\n    \n    def _test_secure_transfer(self) -> bool:\n        """Test secure transfer system."""\n        try:\n            sys.path.insert(0, str(self.ml_dir))\n            from secure_transfer import SecureVoiceTransfer\n            transfer = SecureVoiceTransfer()\n            return transfer is not None\n        except Exception:\n            return False\n    \n    def _test_cloud_client(self) -> bool:\n        """Test cloud training client."""\n        try:\n            sys.path.insert(0, str(self.ml_dir))\n            from cloud_training_client import CloudTrainingClient\n            client = CloudTrainingClient()\n            return client is not None\n        except Exception:\n            return False\n    \n    def _test_pipeline_core(self) -> bool:\n        """Test pipeline core functionality."""\n        try:\n            sys.path.insert(0, str(self.ml_dir))\n            from hybrid_pipeline import HybridVoiceTrainingPipeline\n            # Just test import for now\n            return True\n        except Exception:\n            return False\n    \n    def setup_permissions(self) -> bool:\n        """Setup proper file permissions."""\n        logger.info("🔒 Setting up permissions...")\n        \n        try:\n            # Make scripts executable\n            scripts = [\n                self.ml_dir / "hybrid_pipeline.py",\n                self.ml_dir / "model_manager.py", \n                self.ml_dir / "secure_transfer.py",\n                self.ml_dir / "cloud_training_client.py",\n                self.ml_dir / "setup_hybrid_training.py"\n            ]\n            \n            for script in scripts:\n                if script.exists():\n                    os.chmod(script, 0o755)\n                    logger.info(f"  ✅ Made executable: {script.name}")\n            \n            # Set directory permissions\n            directories = [\n                self.models_dir,\n                self.voice_dir\n            ]\n            \n            for directory in directories:\n                if directory.exists():\n                    os.chmod(directory, 0o755)\n                    logger.info(f"  ✅ Set permissions: {directory}")\n            \n            return True\n            \n        except Exception as e:\n            logger.error(f"Permission setup failed: {e}")\n            return False\n    \n    def print_setup_summary(self):\n        """Print setup completion summary."""\n        print("\\n" + "="*60)\n        print("🎉 HYBRID VOICE TRAINING SETUP COMPLETE!")\n        print("="*60)\n        \n        print("\\n📊 System Status:")\n        for check, result in self.validation_results.items():\n            status = "✅" if result["passed"] else "❌"\n            print(f"  {status} {check}: {result['message']}")\n        \n        print("\\n🚀 Quick Start:")\n        print(f"  1. Record voice samples through web interface")\n        print(f"  2. Run: ./ml/quick_start_training.sh")\n        print(f"  3. Follow Google Colab instructions")\n        print(f"  4. Deploy trained model")\n        \n        print("\\n📁 Key Files:")\n        print(f"  📓 Documentation: {self.ml_dir}/README_HYBRID_TRAINING.md")\n        print(f"  ⚙️ Configuration: {self.ml_dir}/pipeline_config.json")\n        print(f"  🚀 Quick Start: {self.ml_dir}/quick_start_training.sh")\n        print(f"  📊 Status Check: {self.ml_dir}/check_status.sh")\n        \n        print("\\n🔧 Manual Commands:")\n        print(f"  Start Training:   python {self.ml_dir}/hybrid_pipeline.py start --user-id lukemoeller_yahoo_com")\n        print(f"  Check Status:     python {self.ml_dir}/hybrid_pipeline.py status")\n        print(f"  List Models:      python {self.ml_dir}/model_manager.py list")\n        print(f"  Monitor System:   python {self.ml_dir}/hybrid_pipeline.py monitor")\n        \n        print("\\n🌐 API Endpoints (when inference server running):")\n        print(f"  Voice Status:     http://localhost:8000/voice/status")\n        print(f"  List Models:      http://localhost:8000/voice/models")\n        print(f"  Health Check:     http://localhost:8000/health")\n        \n        print("\\n⚠️ Important Notes:")\n        print(f"  • Voice data stays secure on your local system")\n        print(f"  • Cloud training uses free Google Colab/Kaggle GPUs")\n        print(f"  • Trained models deployed automatically to RTX 5090")\n        print(f"  • Minimum 3 voice files (60+ seconds) recommended")\n        \n        print("\\n📖 For detailed instructions, see:")\n        print(f"  {self.ml_dir}/README_HYBRID_TRAINING.md")\n        print("\\n" + "="*60)\n\ndef main():\n    \"\"\"Main setup function.\"\"\"\n    print("🔧 Hybrid Voice Training Setup")\n    print("==============================\\n")\n    \n    setup = HybridTrainingSetup()\n    \n    if setup.run_full_setup():\n        print("\\n🎉 Setup completed successfully!")\n        sys.exit(0)\n    else:\n        print("\\n❌ Setup failed. Please check the logs above.")\n        sys.exit(1)\n\nif __name__ == "__main__":\n    main()\n