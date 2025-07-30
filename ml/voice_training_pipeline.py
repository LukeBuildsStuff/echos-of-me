"""
Voice Training Pipeline for RTX 5090
Orchestrates the complete training workflow
"""

import os
import sys
import json
import logging
import subprocess
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import docker
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VoiceTrainingPipeline:
    """Complete voice training pipeline orchestrator."""
    
    def __init__(self):
        self.docker_client = docker.from_env()
        self.training_image = "nvcr.io/nvidia/pytorch:25.04-py3"  # Use NVIDIA RTX 5090 compatible container
        self.base_dir = Path("/home/luke/personal-ai-clone")
        self.ml_dir = self.base_dir / "ml"
        self.voices_dir = self.base_dir / "web" / "public" / "voices"
        self.models_dir = self.base_dir / "models" / "voices"
        
        # Ensure directories exist
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def build_training_container(self) -> bool:
        """Ensure the RTX 5090 training container is available."""
        try:
            logger.info("Checking RTX 5090 training container...")
            
            # Check if the NVIDIA PyTorch container is available
            try:
                self.docker_client.images.get(self.training_image)
                logger.info("✅ RTX 5090 training container available")
                return True
            except docker.errors.ImageNotFound:
                logger.info("Pulling RTX 5090 training container...")
                # Pull the container if not available
                self.docker_client.images.pull(self.training_image)
                logger.info("✅ RTX 5090 training container pulled successfully")
                return True
            
        except Exception as e:
            logger.error(f"Failed to setup training container: {e}")
            return False

    def check_voice_data(self, user_id: str) -> Dict[str, any]:
        """Check available voice data for training."""
        user_voice_dir = self.voices_dir / user_id
        
        if not user_voice_dir.exists():
            return {
                'valid': False,
                'error': f'No voice data directory found for user {user_id}',
                'path': str(user_voice_dir)
            }
        
        # Find audio files
        audio_files = []
        for pattern in ['*.wav', '*.webm', '*.mp3', '*.flac']:
            audio_files.extend(user_voice_dir.glob(pattern))
        
        if not audio_files:
            return {
                'valid': False,
                'error': f'No audio files found in {user_voice_dir}',
                'path': str(user_voice_dir)
            }
        
        # Analyze audio files
        total_duration = 0
        file_info = []
        
        for audio_file in audio_files:
            try:
                # Get file size and modification time
                stat = audio_file.stat()
                file_info.append({
                    'name': audio_file.name,
                    'size_mb': stat.st_size / 1e6,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
            except Exception as e:
                logger.warning(f"Could not analyze {audio_file}: {e}")
        
        return {
            'valid': True,
            'file_count': len(audio_files),
            'files': file_info,
            'voice_dir': str(user_voice_dir),
            'total_size_mb': sum(f['size_mb'] for f in file_info)
        }

    def run_training(
        self, 
        user_id: str, 
        epochs: int = 100, 
        batch_size: int = 8,
        learning_rate: float = 5e-5,
        mixed_precision: bool = True
    ) -> Dict[str, any]:
        """Run voice training in RTX 5090 optimized container."""
        
        logger.info(f"Starting voice training for user: {user_id}")
        
        # Check voice data first
        voice_check = self.check_voice_data(user_id)
        if not voice_check['valid']:
            return {
                'success': False,
                'error': voice_check['error'],
                'user_id': user_id
            }
        
        logger.info(f"Found {voice_check['file_count']} voice files ({voice_check['total_size_mb']:.1f} MB)")
        
        try:
            # Create volume mounts
            volumes = {
                str(self.voices_dir): {'bind': '/web/public/voices', 'mode': 'ro'},
                str(self.models_dir): {'bind': '/models/voices', 'mode': 'rw'},
                str(self.ml_dir): {'bind': '/workspace', 'mode': 'ro'}  # Mount ML directory for training scripts
            }
            
            # Run simple RTX 5090 training to test compatibility
            training_cmd = (
                "cd /workspace && "
                f"python simple_rtx5090_trainer.py --user_id {user_id} --epochs {epochs} "
                f"--batch_size {batch_size} --learning_rate {learning_rate}"
            )
            
            if mixed_precision:
                training_cmd += " --mixed_precision"
                
            command = ["bash", "-c", training_cmd]
            
            # Run training container
            logger.info("Starting training container...")
            logger.info(f"Command: {' '.join(command)}")
            
            container = self.docker_client.containers.run(
                image=self.training_image,
                command=command,
                volumes=volumes,
                device_requests=[
                    docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])
                ],
                environment={
                    'CUDA_VISIBLE_DEVICES': '0',
                    'NVIDIA_VISIBLE_DEVICES': 'all',
                    'COQUI_TOS_AGREED': '1'
                },
                remove=True,
                detach=False,
                stdout=True,
                stderr=True,
                stream=True
            )
            
            # Stream training logs
            training_start = time.time()
            training_logs = []
            
            try:
                for log in container:
                    log_line = log.decode('utf-8').strip()
                    if log_line:
                        logger.info(f"[TRAINING] {log_line}")
                        training_logs.append(log_line)
                        
                        # Check for completion indicators
                        if "Training completed successfully" in log_line:
                            logger.info("✅ Training completed successfully!")
                        elif "Training failed" in log_line:
                            logger.error("❌ Training failed!")
                            
            except Exception as stream_error:
                logger.error(f"Error streaming logs: {stream_error}")
            
            training_time = time.time() - training_start
            
            # Check if model was created
            user_model_dir = self.models_dir / user_id
            if user_model_dir.exists():
                latest_link = user_model_dir / "latest"
                if latest_link.exists() and latest_link.is_symlink():
                    model_path = latest_link.resolve()
                    
                    # Verify model files
                    required_files = ['model.pth', 'config.json', 'metadata.json']
                    missing_files = [f for f in required_files if not (model_path / f).exists()]
                    
                    if not missing_files:
                        return {
                            'success': True,
                            'user_id': user_id,
                            'model_path': str(model_path),
                            'training_time': training_time,
                            'voice_files_used': voice_check['file_count'],
                            'training_logs': training_logs[-50:],  # Last 50 lines
                            'message': 'Voice training completed successfully'
                        }
                    else:
                        return {
                            'success': False,
                            'error': f'Training completed but missing files: {missing_files}',
                            'user_id': user_id,
                            'training_logs': training_logs[-20:]
                        }
            
            return {
                'success': False,
                'error': 'Training completed but no model output found',
                'user_id': user_id,
                'training_time': training_time,
                'training_logs': training_logs[-20:]
            }
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'user_id': user_id
            }

    def deploy_trained_model(self, user_id: str) -> Dict[str, any]:
        """Deploy trained model to the inference service."""
        try:
            user_model_dir = self.models_dir / user_id
            latest_link = user_model_dir / "latest"
            
            if not latest_link.exists():
                return {
                    'success': False,
                    'error': f'No trained model found for user {user_id}'
                }
            
            model_dir = latest_link.resolve()
            
            # Verify model files
            required_files = ['model.pth', 'config.json', 'metadata.json']
            missing_files = [f for f in required_files if not (model_dir / f).exists()]
            
            if missing_files:
                return {
                    'success': False,
                    'error': f'Incomplete model: missing {missing_files}'
                }
            
            # Load metadata
            with open(model_dir / 'metadata.json', 'r') as f:
                metadata = json.load(f)
            
            # Notify inference service to reload models
            try:
                import requests
                response = requests.post('http://localhost:8000/voice/models/refresh')
                if response.status_code == 200:
                    logger.info("✅ Inference service notified of new model")
                else:
                    logger.warning(f"Failed to notify inference service: {response.status_code}")
            except Exception as e:
                logger.warning(f"Could not notify inference service: {e}")
            
            return {
                'success': True,
                'user_id': user_id,
                'model_path': str(model_dir),
                'model_version': metadata.get('model_version'),
                'created_at': metadata.get('created_at'),
                'message': 'Model deployed successfully'
            }
            
        except Exception as e:
            logger.error(f"Model deployment failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def list_trained_models(self, user_id: Optional[str] = None) -> Dict[str, any]:
        """List all trained models."""
        try:
            models = {}
            
            if user_id:
                user_dirs = [self.models_dir / user_id] if (self.models_dir / user_id).exists() else []
            else:
                user_dirs = [d for d in self.models_dir.iterdir() if d.is_dir()]
            
            for user_dir in user_dirs:
                user_id_name = user_dir.name
                user_models = []
                
                # Find all model versions
                for model_dir in user_dir.iterdir():
                    if model_dir.is_dir() and model_dir.name != "latest":
                        metadata_file = model_dir / "metadata.json"
                        if metadata_file.exists():
                            try:
                                with open(metadata_file, 'r') as f:
                                    metadata = json.load(f)
                                
                                user_models.append({
                                    'version': model_dir.name,
                                    'path': str(model_dir),
                                    'created_at': metadata.get('created_at'),
                                    'final_loss': metadata.get('final_loss'),
                                    'epochs': metadata.get('epochs')
                                })
                            except Exception as e:
                                logger.warning(f"Could not read metadata for {model_dir}: {e}")
                
                # Sort by creation time
                user_models.sort(key=lambda x: x['created_at'], reverse=True)
                
                if user_models:
                    models[user_id_name] = {
                        'models': user_models,
                        'latest': user_models[0] if user_models else None,
                        'count': len(user_models)
                    }
            
            return {
                'success': True,
                'users': models,
                'total_users': len(models),
                'total_models': sum(m['count'] for m in models.values())
            }
            
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def cleanup_old_models(self, user_id: str, keep_versions: int = 5) -> Dict[str, any]:
        """Clean up old model versions, keeping only the newest ones."""
        try:
            user_dir = self.models_dir / user_id
            if not user_dir.exists():
                return {
                    'success': False,
                    'error': f'No models found for user {user_id}'
                }
            
            # Find all model versions (exclude 'latest' symlink)
            model_dirs = [d for d in user_dir.iterdir() if d.is_dir() and d.name != "latest"]
            
            if len(model_dirs) <= keep_versions:
                return {
                    'success': True,
                    'message': f'No cleanup needed. Only {len(model_dirs)} versions found.',
                    'cleaned': 0
                }
            
            # Sort by modification time (newest first)
            model_dirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
            
            # Remove old versions
            removed_count = 0
            removed_versions = []
            
            for old_dir in model_dirs[keep_versions:]:
                try:
                    import shutil
                    shutil.rmtree(old_dir)
                    removed_versions.append(old_dir.name)
                    removed_count += 1
                    logger.info(f"Removed old model version: {old_dir.name}")
                except Exception as e:
                    logger.error(f"Failed to remove {old_dir}: {e}")
            
            return {
                'success': True,
                'user_id': user_id,
                'cleaned': removed_count,
                'removed_versions': removed_versions,
                'kept_versions': keep_versions,
                'message': f'Cleaned up {removed_count} old model versions'
            }
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }


def main():
    """CLI interface for voice training pipeline."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Voice Training Pipeline for RTX 5090")
    parser.add_argument("--action", required=True, 
                       choices=['build', 'train', 'deploy', 'list', 'cleanup', 'check'],
                       help="Action to perform")
    parser.add_argument("--user_id", help="User ID for training/deployment")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size")
    parser.add_argument("--learning_rate", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--keep_versions", type=int, default=5, help="Versions to keep during cleanup")
    
    args = parser.parse_args()
    
    pipeline = VoiceTrainingPipeline()
    
    if args.action == 'build':
        logger.info("Building training container...")
        success = pipeline.build_training_container()
        print("✅ Container built successfully" if success else "❌ Container build failed")
    
    elif args.action == 'check':
        if not args.user_id:
            print("❌ --user_id required for check action")
            sys.exit(1)
        
        result = pipeline.check_voice_data(args.user_id)
        if result['valid']:
            print(f"✅ Voice data found for {args.user_id}:")
            print(f"   Files: {result['file_count']}")
            print(f"   Total size: {result['total_size_mb']:.1f} MB")
            for file_info in result['files']:
                print(f"   - {file_info['name']} ({file_info['size_mb']:.1f} MB)")
        else:
            print(f"❌ {result['error']}")
    
    elif args.action == 'train':
        if not args.user_id:
            print("❌ --user_id required for training")
            sys.exit(1)
        
        result = pipeline.run_training(
            user_id=args.user_id,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate
        )
        
        if result['success']:
            print(f"✅ Training completed for {args.user_id}")
            print(f"   Model: {result['model_path']}")
            print(f"   Time: {result['training_time']:.1f}s")
        else:
            print(f"❌ Training failed: {result['error']}")
    
    elif args.action == 'deploy':
        if not args.user_id:
            print("❌ --user_id required for deployment")
            sys.exit(1)
        
        result = pipeline.deploy_trained_model(args.user_id)
        if result['success']:
            print(f"✅ Model deployed for {args.user_id}")
            print(f"   Version: {result['model_version']}")
        else:
            print(f"❌ Deployment failed: {result['error']}")
    
    elif args.action == 'list':
        result = pipeline.list_trained_models(args.user_id)
        if result['success']:
            print(f"📋 Found models for {result['total_users']} users ({result['total_models']} total models)")
            for user_id, user_data in result['users'].items():
                print(f"\n👤 {user_id}: {user_data['count']} models")
                for model in user_data['models'][:3]:  # Show latest 3
                    print(f"   - {model['version']} (loss: {model['final_loss']:.4f})")
        else:
            print(f"❌ Failed to list models: {result['error']}")
    
    elif args.action == 'cleanup':
        if not args.user_id:
            print("❌ --user_id required for cleanup")
            sys.exit(1)
        
        result = pipeline.cleanup_old_models(args.user_id, args.keep_versions)
        if result['success']:
            print(f"🧹 Cleanup completed: {result['message']}")
        else:
            print(f"❌ Cleanup failed: {result['error']}")


if __name__ == "__main__":
    main()