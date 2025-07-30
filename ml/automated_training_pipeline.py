"""
Automated Voice Training Pipeline with Progress Monitoring
Complete end-to-end training solution for RTX 5090
"""

import os
import sys
import json
import logging
import time
import asyncio
import threading
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import subprocess
import psutil
import GPUtil

# Import our custom modules
from voice_data_preprocessor import VoiceDataPreprocessor
from voice_training_pipeline import VoiceTrainingPipeline
from model_deployment_system import ModelDeploymentSystem

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TrainingStatus(Enum):
    """Training status enumeration."""
    PENDING = "pending"
    PREPROCESSING = "preprocessing"
    TRAINING = "training"
    VALIDATING = "validating"
    DEPLOYING = "deploying"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TrainingProgress:
    """Training progress tracking."""
    user_id: str
    status: TrainingStatus
    start_time: datetime
    current_step: str
    progress_percentage: float
    eta_minutes: Optional[float]
    current_epoch: int
    total_epochs: int
    current_loss: Optional[float]
    best_loss: Optional[float]
    gpu_utilization: float
    gpu_memory_used: float
    gpu_memory_total: float
    logs: List[str]
    error_message: Optional[str] = None


@dataclass
class TrainingConfig:
    """Complete training configuration."""
    user_id: str
    
    # Preprocessing settings
    preprocess_data: bool = True
    apply_audio_filters: bool = True
    target_sample_rate: int = 22050
    
    # Training settings
    num_epochs: int = 200
    batch_size: int = 6
    learning_rate: float = 1e-5
    mixed_precision: bool = True
    freeze_encoder: bool = False
    
    # Deployment settings
    auto_deploy: bool = True
    cleanup_old_models: bool = True
    keep_model_versions: int = 3
    
    # Monitoring settings
    save_progress_every: int = 10  # seconds
    monitor_gpu: bool = True
    enable_notifications: bool = False


class TrainingProgressMonitor:
    """Monitor training progress and system resources."""
    
    def __init__(self, progress_callback: Optional[Callable] = None):
        self.progress_callback = progress_callback
        self.monitoring = False
        self.monitor_thread = None
        self.current_progress = None
        
    def start_monitoring(self, user_id: str, total_epochs: int):
        """Start monitoring training progress."""
        self.current_progress = TrainingProgress(
            user_id=user_id,
            status=TrainingStatus.PENDING,
            start_time=datetime.now(),
            current_step="Initializing",
            progress_percentage=0.0,
            eta_minutes=None,
            current_epoch=0,
            total_epochs=total_epochs,
            current_loss=None,
            best_loss=None,
            gpu_utilization=0.0,
            gpu_memory_used=0.0,
            gpu_memory_total=0.0,
            logs=[]
        )
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        logger.info(f"Started monitoring training for {user_id}")
    
    def stop_monitoring(self):
        """Stop monitoring."""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("Stopped training monitoring")
    
    def update_progress(
        self,
        status: TrainingStatus = None,
        current_step: str = None,
        progress_percentage: float = None,
        current_epoch: int = None,
        current_loss: float = None,
        best_loss: float = None,
        log_message: str = None,
        error_message: str = None
    ):
        """Update training progress."""
        if not self.current_progress:
            return
        
        if status:
            self.current_progress.status = status
        if current_step:
            self.current_progress.current_step = current_step
        if progress_percentage is not None:
            self.current_progress.progress_percentage = progress_percentage
        if current_epoch is not None:
            self.current_progress.current_epoch = current_epoch
        if current_loss is not None:
            self.current_progress.current_loss = current_loss
        if best_loss is not None:
            self.current_progress.best_loss = best_loss
        if log_message:
            self.current_progress.logs.append(f"{datetime.now().strftime('%H:%M:%S')} - {log_message}")
            # Keep only last 50 log messages
            if len(self.current_progress.logs) > 50:
                self.current_progress.logs = self.current_progress.logs[-50:]
        if error_message:
            self.current_progress.error_message = error_message
        
        # Calculate ETA
        if progress_percentage and progress_percentage > 0:
            elapsed_time = (datetime.now() - self.current_progress.start_time).total_seconds() / 60
            estimated_total_time = elapsed_time / (progress_percentage / 100)
            self.current_progress.eta_minutes = max(0, estimated_total_time - elapsed_time)
        
        # Call progress callback if provided
        if self.progress_callback:
            try:
                self.progress_callback(self.current_progress)
            except Exception as e:
                logger.warning(f"Progress callback failed: {e}")
    
    def _monitor_loop(self):
        """Background monitoring loop."""
        while self.monitoring:
            try:
                # Update GPU stats
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # RTX 5090
                    self.current_progress.gpu_utilization = gpu.load * 100
                    self.current_progress.gpu_memory_used = gpu.memoryUsed
                    self.current_progress.gpu_memory_total = gpu.memoryTotal
                
                time.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.warning(f"Monitoring error: {e}")
                time.sleep(10)
    
    def get_progress(self) -> Optional[TrainingProgress]:
        """Get current progress."""
        return self.current_progress
    
    def save_progress_log(self, output_dir: Path):
        """Save progress log to file."""
        try:
            if not self.current_progress:
                return
            
            log_file = output_dir / f"training_progress_{self.current_progress.user_id}.json"
            progress_dict = asdict(self.current_progress)
            
            # Convert datetime to string
            progress_dict['start_time'] = self.current_progress.start_time.isoformat()
            progress_dict['status'] = self.current_progress.status.value
            
            with open(log_file, 'w') as f:
                json.dump(progress_dict, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save progress log: {e}")


class AutomatedTrainingPipeline:
    """Complete automated training pipeline with monitoring."""
    
    def __init__(self):
        self.preprocessor = VoiceDataPreprocessor()
        self.training_pipeline = VoiceTrainingPipeline()
        self.deployment_system = ModelDeploymentSystem()
        self.monitor = TrainingProgressMonitor()
        
        # Paths
        self.base_dir = Path("/home/luke/personal-ai-clone")
        self.logs_dir = self.base_dir / "ml" / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        
        # State
        self.active_trainings = {}
    
    def run_complete_training(self, config: TrainingConfig) -> Dict[str, Any]:
        """Run complete end-to-end training pipeline."""
        user_id = config.user_id
        logger.info(f"Starting complete training pipeline for {user_id}")
        
        # Start monitoring
        self.monitor.start_monitoring(user_id, config.num_epochs)
        self.active_trainings[user_id] = {
            'config': config,
            'start_time': datetime.now(),
            'monitor': self.monitor
        }
        
        try:
            # Step 1: Data preprocessing
            self.monitor.update_progress(
                status=TrainingStatus.PREPROCESSING,
                current_step="Analyzing voice data",
                progress_percentage=5.0,
                log_message="Starting data preprocessing"
            )
            
            preprocessing_result = self._run_preprocessing(config)
            if not preprocessing_result['success']:
                raise Exception(f"Preprocessing failed: {preprocessing_result['error']}")
            
            self.monitor.update_progress(
                progress_percentage=15.0,
                log_message=f"Preprocessing completed: {preprocessing_result['processed_files']} files ready"
            )
            
            # Step 2: Build training container if needed
            self.monitor.update_progress(
                current_step="Preparing training environment",
                progress_percentage=20.0,
                log_message="Building training container"
            )
            
            container_result = self._ensure_training_container()
            if not container_result['success']:
                raise Exception(f"Container setup failed: {container_result['error']}")
            
            self.monitor.update_progress(
                progress_percentage=25.0,
                log_message="Training environment ready"
            )
            
            # Step 3: Run training
            self.monitor.update_progress(
                status=TrainingStatus.TRAINING,
                current_step="Training voice model",
                progress_percentage=30.0,
                log_message="Starting model training"
            )
            
            training_result = self._run_training_with_monitoring(config)
            if not training_result['success']:
                raise Exception(f"Training failed: {training_result['error']}")
            
            self.monitor.update_progress(
                progress_percentage=85.0,
                log_message=f"Training completed: final loss {training_result.get('final_loss', 'N/A')}"
            )
            
            # Step 4: Model deployment
            if config.auto_deploy:
                self.monitor.update_progress(
                    status=TrainingStatus.DEPLOYING,
                    current_step="Deploying trained model",
                    progress_percentage=90.0,
                    log_message="Deploying model to inference service"
                )
                
                deployment_result = self._run_deployment(config)
                if not deployment_result['success']:
                    logger.warning(f"Deployment failed: {deployment_result['error']}")
                    # Don't fail the entire pipeline for deployment issues
                else:
                    self.monitor.update_progress(
                        log_message="Model deployed successfully"
                    )
            
            # Step 5: Cleanup
            if config.cleanup_old_models:
                self.monitor.update_progress(
                    current_step="Cleaning up old models",
                    progress_percentage=95.0,
                    log_message="Cleaning up old model versions"
                )
                
                cleanup_result = self._run_cleanup(config)
                self.monitor.update_progress(
                    log_message=f"Cleanup completed: {cleanup_result.get('message', 'Done')}"
                )
            
            # Completion
            self.monitor.update_progress(
                status=TrainingStatus.COMPLETED,
                current_step="Training completed",
                progress_percentage=100.0,
                log_message="Training pipeline completed successfully"
            )
            
            # Save final progress log
            self.monitor.save_progress_log(self.logs_dir)
            
            total_time = (datetime.now() - self.active_trainings[user_id]['start_time']).total_seconds()
            
            logger.info(f"✅ Complete training pipeline finished for {user_id} in {total_time:.1f}s")
            
            return {
                'success': True,
                'user_id': user_id,
                'total_time': total_time,
                'preprocessing': preprocessing_result,
                'training': training_result,
                'deployment': deployment_result if config.auto_deploy else None,
                'cleanup': cleanup_result if config.cleanup_old_models else None,
                'progress_log': str(self.logs_dir / f"training_progress_{user_id}.json")
            }
            
        except Exception as e:
            logger.error(f"Training pipeline failed for {user_id}: {e}")
            
            self.monitor.update_progress(
                status=TrainingStatus.FAILED,
                error_message=str(e),
                log_message=f"Pipeline failed: {str(e)}"
            )
            
            self.monitor.save_progress_log(self.logs_dir)
            
            return {
                'success': False,
                'user_id': user_id,
                'error': str(e),
                'progress_log': str(self.logs_dir / f"training_progress_{user_id}.json")
            }
        
        finally:
            # Cleanup monitoring
            self.monitor.stop_monitoring()
            if user_id in self.active_trainings:
                del self.active_trainings[user_id]
    
    def _run_preprocessing(self, config: TrainingConfig) -> Dict[str, Any]:
        """Run data preprocessing step."""
        try:
            if not config.preprocess_data:
                return {'success': True, 'processed_files': 0, 'message': 'Preprocessing skipped'}
            
            voice_dir = Path("/web/public/voices") / config.user_id
            
            # Analyze data first
            analysis = self.preprocessor.analyze_voice_directory(voice_dir)
            if not analysis['success']:
                return analysis
            
            self.monitor.update_progress(
                log_message=f"Found {analysis['total_files']} voice files, {analysis['valid_files']} valid"
            )
            
            # Run preprocessing if needed
            if analysis['files_needing_conversion'] > 0 or config.apply_audio_filters:
                output_dir = voice_dir / "processed"
                result = self.preprocessor.preprocess_voice_directory(
                    voice_dir, 
                    output_dir, 
                    config.apply_audio_filters
                )
                return result
            else:
                return {
                    'success': True,
                    'processed_files': analysis['valid_files'],
                    'message': 'No preprocessing needed'
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _ensure_training_container(self) -> Dict[str, Any]:
        """Ensure training container is built and ready."""
        try:
            # Check if container already exists
            result = self.training_pipeline.docker_client.images.list(name="voice-training-rtx5090")
            
            if not result:
                # Build container
                success = self.training_pipeline.build_training_container()
                if not success:
                    return {'success': False, 'error': 'Failed to build training container'}
            
            return {'success': True, 'message': 'Training container ready'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _run_training_with_monitoring(self, config: TrainingConfig) -> Dict[str, Any]:
        """Run training with progress monitoring."""
        try:
            # Start training in a separate thread to allow monitoring
            training_result = self.training_pipeline.run_training(
                user_id=config.user_id,
                epochs=config.num_epochs,
                batch_size=config.batch_size,
                learning_rate=config.learning_rate,
                mixed_precision=config.mixed_precision
            )
            
            # Update progress based on training result
            if training_result['success']:
                self.monitor.update_progress(
                    best_loss=training_result.get('final_loss'),
                    current_epoch=config.num_epochs
                )
            
            return training_result
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _run_deployment(self, config: TrainingConfig) -> Dict[str, Any]:
        """Run model deployment."""
        try:
            return self.deployment_system.deploy_model(config.user_id)
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _run_cleanup(self, config: TrainingConfig) -> Dict[str, Any]:
        """Run model cleanup."""
        try:
            return self.deployment_system.cleanup_old_deployments(
                config.user_id, 
                config.keep_model_versions
            )
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_training_status(self, user_id: str) -> Optional[TrainingProgress]:
        """Get current training status for a user."""
        if user_id in self.active_trainings:
            monitor = self.active_trainings[user_id]['monitor']
            return monitor.get_progress()
        return None
    
    def cancel_training(self, user_id: str) -> Dict[str, Any]:
        """Cancel ongoing training."""
        try:
            if user_id not in self.active_trainings:
                return {
                    'success': False,
                    'error': f'No active training found for user {user_id}'
                }
            
            # Update status
            monitor = self.active_trainings[user_id]['monitor']
            monitor.update_progress(
                status=TrainingStatus.CANCELLED,
                log_message="Training cancelled by user"
            )
            
            # Stop monitoring
            monitor.stop_monitoring()
            
            # Cleanup
            del self.active_trainings[user_id]
            
            logger.info(f"Training cancelled for {user_id}")
            
            return {
                'success': True,
                'user_id': user_id,
                'message': 'Training cancelled successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to cancel training for {user_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_active_trainings(self) -> Dict[str, Any]:
        """List all active training sessions."""
        active = {}
        
        for user_id, training_info in self.active_trainings.items():
            monitor = training_info['monitor']
            progress = monitor.get_progress()
            
            if progress:
                active[user_id] = {
                    'status': progress.status.value,
                    'progress_percentage': progress.progress_percentage,
                    'current_step': progress.current_step,
                    'start_time': progress.start_time.isoformat(),
                    'eta_minutes': progress.eta_minutes
                }
        
        return {
            'success': True,
            'active_trainings': active,
            'count': len(active)
        }


def main():
    """CLI interface for automated training pipeline."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Automated Voice Training Pipeline")
    parser.add_argument("--action", required=True,
                       choices=['train', 'status', 'cancel', 'list'],
                       help="Action to perform")
    parser.add_argument("--user_id", required=True, help="User ID for training")
    parser.add_argument("--epochs", type=int, default=200, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=6, help="Batch size")
    parser.add_argument("--learning_rate", type=float, default=1e-5, help="Learning rate")
    parser.add_argument("--no_preprocess", action="store_true", help="Skip preprocessing")
    parser.add_argument("--no_filters", action="store_true", help="Skip audio filters")
    parser.add_argument("--no_deploy", action="store_true", help="Skip auto deployment")
    parser.add_argument("--no_cleanup", action="store_true", help="Skip cleanup")
    
    args = parser.parse_args()
    
    pipeline = AutomatedTrainingPipeline()
    
    if args.action == 'train':
        print(f"🚀 Starting automated training pipeline for {args.user_id}")
        
        # Create training config
        config = TrainingConfig(
            user_id=args.user_id,
            num_epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            preprocess_data=not args.no_preprocess,
            apply_audio_filters=not args.no_filters,
            auto_deploy=not args.no_deploy,
            cleanup_old_models=not args.no_cleanup
        )
        
        # Run training
        result = pipeline.run_complete_training(config)
        
        if result['success']:
            print(f"✅ Training pipeline completed successfully!")
            print(f"   Total time: {result['total_time']:.1f}s")
            print(f"   Progress log: {result['progress_log']}")
            
            if result.get('training'):
                training = result['training']
                print(f"   Training time: {training.get('training_time', 0):.1f}s")
                print(f"   Model path: {training.get('model_path', 'N/A')}")
        else:
            print(f"❌ Training pipeline failed: {result['error']}")
            print(f"   Progress log: {result['progress_log']}")
    
    elif args.action == 'status':
        progress = pipeline.get_training_status(args.user_id)
        if progress:
            print(f"📊 Training Status for {args.user_id}:")
            print(f"   Status: {progress.status.value}")
            print(f"   Progress: {progress.progress_percentage:.1f}%")
            print(f"   Current Step: {progress.current_step}")
            print(f"   Epoch: {progress.current_epoch}/{progress.total_epochs}")
            print(f"   GPU Usage: {progress.gpu_utilization:.1f}% ({progress.gpu_memory_used:.1f}/{progress.gpu_memory_total:.1f} GB)")
            if progress.eta_minutes:
                print(f"   ETA: {progress.eta_minutes:.1f} minutes")
            if progress.current_loss:
                print(f"   Current Loss: {progress.current_loss:.4f}")
            if progress.error_message:
                print(f"   Error: {progress.error_message}")
        else:
            print(f"❌ No active training found for {args.user_id}")
    
    elif args.action == 'cancel':
        result = pipeline.cancel_training(args.user_id)
        if result['success']:
            print(f"🛑 Training cancelled for {args.user_id}")
        else:
            print(f"❌ Failed to cancel training: {result['error']}")
    
    elif args.action == 'list':
        result = pipeline.list_active_trainings()
        if result['success']:
            active = result['active_trainings']
            print(f"📋 Active Training Sessions ({result['count']}):")
            
            if not active:
                print("   No active training sessions")
            else:
                for user_id, info in active.items():
                    eta_str = f", ETA: {info['eta_minutes']:.1f}min" if info['eta_minutes'] else ""
                    print(f"   • {user_id}: {info['status']} ({info['progress_percentage']:.1f}%{eta_str})")
        else:
            print(f"❌ Failed to list trainings: {result.get('error', 'Unknown error')}")


if __name__ == "__main__":
    main()