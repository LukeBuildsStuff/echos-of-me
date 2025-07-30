"""
Model Deployment System for Voice Training
Integrates trained models with existing voice inference service
"""

import os
import sys
import json
import logging
import shutil
import requests
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import docker
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ModelDeploymentSystem:
    """System for deploying trained voice models to inference service."""
    
    def __init__(self):
        self.docker_client = docker.from_env()
        self.base_dir = Path("/home/luke/personal-ai-clone")
        self.models_dir = self.base_dir / "models" / "voices"
        self.ml_models_dir = self.base_dir / "ml" / "models" / "voices"
        self.inference_url = "http://localhost:8000"
        
        # Ensure directories exist
        self.ml_models_dir.mkdir(parents=True, exist_ok=True)
    
    def list_available_models(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """List all available trained models."""
        try:
            models = {}
            
            search_dirs = []
            if user_id:
                user_dir = self.models_dir / user_id
                if user_dir.exists():
                    search_dirs = [user_dir]
            else:
                search_dirs = [d for d in self.models_dir.iterdir() if d.is_dir()]
            
            for user_dir in search_dirs:
                user_id_name = user_dir.name
                user_models = []
                
                # Find all model versions
                for model_dir in user_dir.iterdir():
                    if model_dir.is_dir() and model_dir.name != "latest":
                        model_info = self._analyze_model_directory(model_dir, user_id_name)
                        if model_info:
                            user_models.append(model_info)
                
                # Sort by creation time (newest first)
                user_models.sort(key=lambda x: x['created_at'], reverse=True)
                
                if user_models:
                    # Check which is currently deployed
                    deployed_info = self._check_deployed_model(user_id_name)
                    
                    models[user_id_name] = {
                        'models': user_models,
                        'latest': user_models[0] if user_models else None,
                        'count': len(user_models),
                        'deployed': deployed_info
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
    
    def _analyze_model_directory(self, model_dir: Path, user_id: str) -> Optional[Dict[str, Any]]:
        """Analyze a model directory and extract metadata."""
        try:
            # Check for required files
            metadata_file = model_dir / "metadata.json"
            model_file = model_dir / "model.pth"
            config_file = model_dir / "config.json"
            
            if not all(f.exists() for f in [metadata_file, model_file, config_file]):
                logger.warning(f"Incomplete model in {model_dir}")
                return None
            
            # Load metadata
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            # Validate metadata
            required_fields = ['model_version', 'created_at', 'model_type']
            if not all(field in metadata for field in required_fields):
                logger.warning(f"Invalid metadata in {model_dir}")
                return None
            
            # Get file sizes
            model_size = model_file.stat().st_size
            config_size = config_file.stat().st_size
            
            # Calculate training quality metrics
            training_quality = self._assess_training_quality(metadata)
            
            return {
                'model_version': metadata['model_version'],
                'model_path': str(model_dir),
                'created_at': metadata['created_at'],
                'model_type': metadata.get('model_type', 'unknown'),
                'user_id': user_id,
                'final_loss': metadata.get('final_loss'),
                'best_loss': metadata.get('best_loss'),
                'epochs': metadata.get('epochs'),
                'model_size_mb': model_size / 1e6,
                'config_size_kb': config_size / 1e3,
                'training_config': metadata.get('training_config', {}),
                'training_quality': training_quality,
                'gpu_used': metadata.get('gpu_used'),
                'is_deployable': self._check_model_deployable(model_dir)
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze model in {model_dir}: {e}")
            return None
    
    def _assess_training_quality(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Assess the quality of a trained model based on metadata."""
        quality = {
            'score': 0.0,
            'rating': 'unknown',
            'issues': [],
            'strengths': []
        }
        
        try:
            # Check training losses
            final_loss = metadata.get('final_loss')
            best_loss = metadata.get('best_loss')
            training_losses = metadata.get('training_losses', [])
            
            if final_loss is not None and best_loss is not None:
                # Loss convergence
                if final_loss < 0.5:
                    quality['strengths'].append('Low final loss')
                    quality['score'] += 30
                elif final_loss > 2.0:
                    quality['issues'].append('High final loss')
                else:
                    quality['score'] += 20
                
                # Training stability
                if len(training_losses) > 10:
                    recent_losses = training_losses[-10:]
                    loss_variance = sum((l - sum(recent_losses)/len(recent_losses))**2 for l in recent_losses) / len(recent_losses)
                    
                    if loss_variance < 0.01:
                        quality['strengths'].append('Stable convergence')
                        quality['score'] += 25
                    elif loss_variance > 0.1:
                        quality['issues'].append('Unstable training')
                    else:
                        quality['score'] += 15
            
            # Check training configuration
            training_config = metadata.get('training_config', {})
            epochs = metadata.get('epochs', 0)
            
            if epochs >= 100:
                quality['strengths'].append('Sufficient training epochs')
                quality['score'] += 20
            elif epochs < 50:
                quality['issues'].append('Insufficient training epochs')
            else:
                quality['score'] += 10
            
            # Mixed precision usage
            if training_config.get('mixed_precision'):
                quality['strengths'].append('Mixed precision training')
                quality['score'] += 10
            
            # GPU utilization
            if metadata.get('gpu_used') and 'RTX 5090' in metadata.get('gpu_used', ''):
                quality['strengths'].append('Trained on RTX 5090')
                quality['score'] += 15
            
            # Determine rating
            if quality['score'] >= 80:
                quality['rating'] = 'excellent'
            elif quality['score'] >= 60:
                quality['rating'] = 'good'
            elif quality['score'] >= 40:
                quality['rating'] = 'fair'
            else:
                quality['rating'] = 'poor'
            
        except Exception as e:
            logger.warning(f"Failed to assess training quality: {e}")
            quality['issues'].append('Could not assess quality')
        
        return quality
    
    def _check_model_deployable(self, model_dir: Path) -> bool:
        """Check if a model is ready for deployment."""
        try:
            required_files = ['model.pth', 'config.json', 'metadata.json']
            return all((model_dir / f).exists() for f in required_files)
        except Exception:
            return False
    
    def _check_deployed_model(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Check which model is currently deployed for a user."""
        try:
            # Check if there's a model in the ML models directory
            user_ml_dir = self.ml_models_dir / user_id
            if not user_ml_dir.exists():
                return None
            
            latest_link = user_ml_dir / "latest"
            if not latest_link.exists() or not latest_link.is_symlink():
                return None
            
            deployed_dir = latest_link.resolve()
            metadata_file = deployed_dir / "metadata.json"
            
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                return {
                    'model_version': metadata.get('model_version'),
                    'deployed_at': metadata.get('deployed_at'),
                    'model_path': str(deployed_dir)
                }
        
        except Exception as e:
            logger.warning(f"Failed to check deployed model for {user_id}: {e}")
        
        return None
    
    def deploy_model(self, user_id: str, model_version: Optional[str] = None) -> Dict[str, Any]:
        """Deploy a specific model version to the inference service."""
        try:
            logger.info(f"Deploying model for user {user_id}, version: {model_version or 'latest'}")
            
            # Find the model to deploy
            user_dir = self.models_dir / user_id
            if not user_dir.exists():
                return {
                    'success': False,
                    'error': f'No models found for user {user_id}'
                }
            
            # Select model version
            if model_version:
                source_model_dir = user_dir / model_version
                if not source_model_dir.exists():
                    return {
                        'success': False,
                        'error': f'Model version {model_version} not found'
                    }
            else:
                # Use latest model
                latest_link = user_dir / "latest"
                if not latest_link.exists():
                    return {
                        'success': False,
                        'error': f'No latest model found for user {user_id}'
                    }
                source_model_dir = latest_link.resolve()
            
            # Verify model is deployable
            if not self._check_model_deployable(source_model_dir):
                return {
                    'success': False,
                    'error': f'Model {source_model_dir.name} is not deployable (missing files)'
                }
            
            # Copy model to ML models directory
            target_user_dir = self.ml_models_dir / user_id
            target_user_dir.mkdir(exist_ok=True)
            
            # Create deployment directory with timestamp
            deploy_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            target_model_dir = target_user_dir / f"deployed_{deploy_timestamp}"
            
            # Copy model files
            shutil.copytree(source_model_dir, target_model_dir)
            
            # Update deployment metadata
            metadata_file = target_model_dir / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                metadata['deployed_at'] = datetime.now().isoformat()
                metadata['deployment_timestamp'] = deploy_timestamp
                metadata['source_path'] = str(source_model_dir)
                
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
            
            # Update latest symlink
            latest_link = target_user_dir / "latest"
            if latest_link.exists():
                latest_link.unlink()
            latest_link.symlink_to(target_model_dir.name)
            
            # Notify inference service
            notification_result = self._notify_inference_service()
            
            logger.info(f"✅ Model deployed successfully: {target_model_dir}")
            
            return {
                'success': True,
                'user_id': user_id,
                'model_version': source_model_dir.name,
                'deployed_path': str(target_model_dir),
                'deployment_timestamp': deploy_timestamp,
                'inference_notification': notification_result,
                'message': f'Model {source_model_dir.name} deployed successfully'
            }
            
        except Exception as e:
            logger.error(f"Model deployment failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _notify_inference_service(self) -> Dict[str, Any]:
        """Notify the inference service about new model deployment."""
        try:
            # Try to refresh external models
            response = requests.post(
                f"{self.inference_url}/voice/models/refresh",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✅ Inference service notified successfully")
                return {
                    'success': True,
                    'models_found': data.get('models_found', 0),
                    'message': 'Inference service updated'
                }
            else:
                logger.warning(f"Inference service notification failed: {response.status_code}")
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Could not notify inference service: {e}")
            return {
                'success': False,
                'error': f'Connection failed: {str(e)}'
            }
        except Exception as e:
            logger.error(f"Unexpected error notifying inference service: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def rollback_deployment(self, user_id: str) -> Dict[str, Any]:
        """Rollback to previous model deployment."""
        try:
            user_ml_dir = self.ml_models_dir / user_id
            if not user_ml_dir.exists():
                return {
                    'success': False,
                    'error': f'No deployments found for user {user_id}'
                }
            
            # Find deployment directories
            deployment_dirs = [
                d for d in user_ml_dir.iterdir() 
                if d.is_dir() and d.name.startswith('deployed_') and d.name != 'latest'
            ]
            
            if len(deployment_dirs) < 2:
                return {
                    'success': False,
                    'error': 'No previous deployment to rollback to'
                }
            
            # Sort by timestamp (newest first)
            deployment_dirs.sort(key=lambda d: d.name, reverse=True)
            
            # Current deployment is first, previous is second
            previous_deployment = deployment_dirs[1]
            
            # Update latest symlink
            latest_link = user_ml_dir / "latest"
            if latest_link.exists():
                latest_link.unlink()
            latest_link.symlink_to(previous_deployment.name)
            
            # Notify inference service
            notification_result = self._notify_inference_service()
            
            logger.info(f"✅ Rolled back to deployment: {previous_deployment.name}")
            
            return {
                'success': True,
                'user_id': user_id,
                'rolled_back_to': previous_deployment.name,
                'inference_notification': notification_result,
                'message': f'Rolled back to {previous_deployment.name}'
            }
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cleanup_old_deployments(self, user_id: str, keep_deployments: int = 3) -> Dict[str, Any]:
        """Clean up old model deployments."""
        try:
            user_ml_dir = self.ml_models_dir / user_id
            if not user_ml_dir.exists():
                return {
                    'success': False,
                    'error': f'No deployments found for user {user_id}'
                }
            
            # Find deployment directories
            deployment_dirs = [
                d for d in user_ml_dir.iterdir() 
                if d.is_dir() and d.name.startswith('deployed_') and d.name != 'latest'
            ]
            
            if len(deployment_dirs) <= keep_deployments:
                return {
                    'success': True,
                    'message': f'No cleanup needed. Only {len(deployment_dirs)} deployments found.',
                    'cleaned': 0
                }
            
            # Sort by timestamp (newest first)
            deployment_dirs.sort(key=lambda d: d.name, reverse=True)
            
            # Remove old deployments
            removed_count = 0
            removed_deployments = []
            
            for old_deployment in deployment_dirs[keep_deployments:]:
                try:
                    shutil.rmtree(old_deployment)
                    removed_deployments.append(old_deployment.name)
                    removed_count += 1
                    logger.info(f"Removed old deployment: {old_deployment.name}")
                except Exception as e:
                    logger.error(f"Failed to remove {old_deployment}: {e}")
            
            return {
                'success': True,
                'user_id': user_id,
                'cleaned': removed_count,
                'removed_deployments': removed_deployments,
                'kept_deployments': keep_deployments,
                'message': f'Cleaned up {removed_count} old deployments'
            }
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_deployment_status(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get current deployment status."""
        try:
            status = {
                'inference_service': self._check_inference_service_status(),
                'deployments': {}
            }
            
            # Check deployments
            if user_id:
                user_dirs = [self.ml_models_dir / user_id] if (self.ml_models_dir / user_id).exists() else []
            else:
                user_dirs = [d for d in self.ml_models_dir.iterdir() if d.is_dir()]
            
            for user_dir in user_dirs:
                user_id_name = user_dir.name
                
                latest_link = user_dir / "latest"
                if latest_link.exists() and latest_link.is_symlink():
                    deployed_dir = latest_link.resolve()
                    
                    # Get deployment info
                    metadata_file = deployed_dir / "metadata.json"
                    if metadata_file.exists():
                        with open(metadata_file, 'r') as f:
                            metadata = json.load(f)
                        
                        status['deployments'][user_id_name] = {
                            'deployed': True,
                            'model_version': metadata.get('model_version'),
                            'deployed_at': metadata.get('deployed_at'),
                            'deployment_path': str(deployed_dir)
                        }
                    else:
                        status['deployments'][user_id_name] = {
                            'deployed': True,
                            'model_version': deployed_dir.name,
                            'deployed_at': 'unknown',
                            'deployment_path': str(deployed_dir)
                        }
                else:
                    status['deployments'][user_id_name] = {
                        'deployed': False,
                        'reason': 'No latest symlink found'
                    }
            
            return {
                'success': True,
                'status': status,
                'total_deployments': len([d for d in status['deployments'].values() if d.get('deployed')])
            }
            
        except Exception as e:
            logger.error(f"Failed to get deployment status: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _check_inference_service_status(self) -> Dict[str, Any]:
        """Check if inference service is running and responsive."""
        try:
            # Check service health
            response = requests.get(f"{self.inference_url}/health", timeout=5)
            if response.status_code == 200:
                service_status = 'healthy'
            else:
                service_status = f'unhealthy (HTTP {response.status_code})'
            
            # Check voice status
            voice_response = requests.get(f"{self.inference_url}/voice/status", timeout=10)
            if voice_response.status_code == 200:
                voice_data = voice_response.json()
                voice_status = 'available' if voice_data.get('tts_available') else 'unavailable'
            else:
                voice_status = 'unknown'
            
            return {
                'service_status': service_status,
                'voice_status': voice_status,
                'url': self.inference_url,
                'responsive': True
            }
        
        except requests.exceptions.RequestException as e:
            return {
                'service_status': 'unreachable',
                'voice_status': 'unknown',
                'url': self.inference_url,
                'responsive': False,
                'error': str(e)
            }


def main():
    """CLI interface for model deployment system."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Model Deployment System for Voice Training")
    parser.add_argument("--action", required=True,
                       choices=['list', 'deploy', 'rollback', 'cleanup', 'status'],
                       help="Action to perform")
    parser.add_argument("--user_id", help="User ID for deployment operations")
    parser.add_argument("--model_version", help="Specific model version to deploy")
    parser.add_argument("--keep_deployments", type=int, default=3, help="Number of deployments to keep during cleanup")
    
    args = parser.parse_args()
    
    deployment_system = ModelDeploymentSystem()
    
    if args.action == 'list':
        result = deployment_system.list_available_models(args.user_id)
        if result['success']:
            print(f"📋 Available models for {result['total_users']} users ({result['total_models']} total)")
            for user_id, user_data in result['users'].items():
                print(f"\n👤 {user_id}: {user_data['count']} models")
                
                if user_data['deployed']:
                    deployed = user_data['deployed']
                    print(f"   🚀 Deployed: {deployed['model_version']} (at {deployed.get('deployed_at', 'unknown')})")
                else:
                    print(f"   ⏸️  No deployment active")
                
                for model in user_data['models'][:3]:  # Show latest 3
                    quality = model['training_quality']
                    quality_emoji = {'excellent': '🟢', 'good': '🟡', 'fair': '🟠', 'poor': '🔴'}.get(quality['rating'], '⚪')
                    print(f"   {quality_emoji} {model['model_version']} - {quality['rating']} quality (loss: {model.get('final_loss', 'N/A')})")
        else:
            print(f"❌ Failed to list models: {result['error']}")
    
    elif args.action == 'deploy':
        if not args.user_id:
            print("❌ --user_id required for deployment")
            sys.exit(1)
        
        result = deployment_system.deploy_model(args.user_id, args.model_version)
        if result['success']:
            print(f"✅ Model deployed for {args.user_id}")
            print(f"   Version: {result['model_version']}")
            print(f"   Path: {result['deployed_path']}")
            if result.get('inference_notification', {}).get('success'):
                print(f"   🔄 Inference service updated")
        else:
            print(f"❌ Deployment failed: {result['error']}")
    
    elif args.action == 'rollback':
        if not args.user_id:
            print("❌ --user_id required for rollback")
            sys.exit(1)
        
        result = deployment_system.rollback_deployment(args.user_id)
        if result['success']:
            print(f"↩️ Rolled back deployment for {args.user_id}")
            print(f"   Restored: {result['rolled_back_to']}")
        else:
            print(f"❌ Rollback failed: {result['error']}")
    
    elif args.action == 'cleanup':
        if not args.user_id:
            print("❌ --user_id required for cleanup")
            sys.exit(1)
        
        result = deployment_system.cleanup_old_deployments(args.user_id, args.keep_deployments)
        if result['success']:
            print(f"🧹 Cleanup completed for {args.user_id}: {result['message']}")
        else:
            print(f"❌ Cleanup failed: {result['error']}")
    
    elif args.action == 'status':
        result = deployment_system.get_deployment_status(args.user_id)
        if result['success']:
            status = result['status']
            print(f"📊 Deployment Status")
            print(f"   Inference Service: {status['inference_service']['service_status']}")
            print(f"   Voice Service: {status['inference_service']['voice_status']}")
            print(f"   Active Deployments: {result['total_deployments']}")
            
            for user_id, deployment in status['deployments'].items():
                if deployment.get('deployed'):
                    print(f"   ✅ {user_id}: {deployment['model_version']} (deployed {deployment.get('deployed_at', 'unknown')})")
                else:
                    print(f"   ❌ {user_id}: Not deployed ({deployment.get('reason', 'unknown')})")
        else:
            print(f"❌ Failed to get status: {result['error']}")


if __name__ == "__main__":
    main()