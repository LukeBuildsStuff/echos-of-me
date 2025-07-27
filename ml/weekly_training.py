"""
Weekly Training Automation
Runs every Sunday at 3 AM UTC via cron
"""

import os
import sys
import logging
import requests
import schedule
import time
from datetime import datetime, timedelta
from mistral_trainer import MistralTrainer

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/workspace/logs/weekly_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WeeklyTrainingScheduler:
    def __init__(self):
        self.web_api_base = "http://web:3000/api"
        
    def check_training_readiness(self) -> dict:
        """Check if any users are ready for training."""
        try:
            response = requests.get(f"{self.web_api_base}/training/schedule", timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to check training readiness: {e}")
            return {}

    def get_users_needing_training(self) -> list:
        """Get list of users who need model training."""
        try:
            # Get all users with sufficient data
            response = requests.get(f"{self.web_api_base}/admin/users", timeout=30)
            response.raise_for_status()
            users_data = response.json()
            
            users_needing_training = []
            
            for user in users_data.get('users', []):
                # Check if user has enough responses
                if user.get('response_count', 0) >= 50:
                    # Check when they were last trained
                    last_training = self.get_last_training_date(user['id'])
                    
                    # Train if never trained or more than a week ago
                    if not last_training or (datetime.now() - last_training).days >= 7:
                        users_needing_training.append(user)
            
            return users_needing_training
            
        except Exception as e:
            logger.error(f"Failed to get users needing training: {e}")
            return []

    def get_last_training_date(self, user_id: str) -> datetime:
        """Get the last training date for a user."""
        try:
            response = requests.get(
                f"{self.web_api_base}/training/schedule",
                params={'userId': user_id},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('trainingHistory'):
                last_training = data['trainingHistory'][0]
                if last_training.get('completed_at'):
                    return datetime.fromisoformat(last_training['completed_at'].replace('Z', '+00:00'))
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get last training date for user {user_id}: {e}")
            return None

    def trigger_training_for_user(self, user_id: str) -> bool:
        """Trigger training for a specific user."""
        try:
            logger.info(f"Starting training for user: {user_id}")
            
            # Notify web API that training is starting
            response = requests.post(
                f"{self.web_api_base}/training/schedule",
                json={
                    "action": "trigger_training",
                    "userId": user_id
                },
                timeout=30
            )
            response.raise_for_status()
            
            # Run the actual training
            config = {
                "model_name": "mistralai/Mistral-7B-Instruct-v0.2",
                "max_length": 2048,
                "batch_size": 4,
                "learning_rate": 2e-5,
                "num_epochs": 3
            }
            
            trainer = MistralTrainer(config)
            success = trainer.run_training_pipeline(user_id)
            
            if success:
                logger.info(f"Training completed successfully for user: {user_id}")
                
                # Restart inference server to load new model
                self.restart_inference_server()
                
            return success
            
        except Exception as e:
            logger.error(f"Training failed for user {user_id}: {e}")
            return False

    def restart_inference_server(self):
        """Restart the inference server to load the new model."""
        try:
            # Send reload request to inference server
            response = requests.post("http://localhost:8000/model/reload", timeout=60)
            if response.status_code == 200:
                logger.info("Inference server reloaded successfully")
            else:
                logger.warning(f"Failed to reload inference server: {response.status_code}")
        except Exception as e:
            logger.warning(f"Could not restart inference server: {e}")

    def run_weekly_training(self):
        """Run the weekly training process."""
        logger.info("=== Starting Weekly Training Process ===")
        
        try:
            # Check system status
            status = self.check_training_readiness()
            logger.info(f"Training system status: {status.get('currentStatus', {})}")
            
            # Get users needing training
            users_needing_training = self.get_users_needing_training()
            
            if not users_needing_training:
                logger.info("No users need training at this time")
                return
            
            logger.info(f"Found {len(users_needing_training)} users needing training")
            
            # Train each user's model
            successful_trainings = 0
            for user in users_needing_training:
                user_id = user['id']
                user_name = user.get('name', 'Unknown')
                
                logger.info(f"Training model for {user_name} (ID: {user_id})")
                
                success = self.trigger_training_for_user(user_id)
                if success:
                    successful_trainings += 1
                else:
                    logger.error(f"Failed to train model for {user_name}")
                
                # Small delay between trainings to avoid overwhelming the system
                time.sleep(60)
            
            logger.info(f"Weekly training completed: {successful_trainings}/{len(users_needing_training)} successful")
            
        except Exception as e:
            logger.error(f"Weekly training process failed: {e}")
        
        logger.info("=== Weekly Training Process Complete ===")

    def run_health_check(self):
        """Run a health check on the training system."""
        logger.info("Running training system health check...")
        
        try:
            # Check GPU availability
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name()
                memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
                logger.info(f"GPU available: {gpu_name} ({memory_gb:.1f} GB)")
            else:
                logger.warning("GPU not available!")
            
            # Check web API connectivity
            response = requests.get(f"{self.web_api_base}/training/schedule", timeout=10)
            if response.status_code == 200:
                logger.info("Web API connectivity: OK")
            else:
                logger.warning(f"Web API connectivity issues: {response.status_code}")
            
            # Check inference server
            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code == 200:
                    logger.info("Inference server: OK")
                else:
                    logger.warning("Inference server not responding")
            except:
                logger.warning("Inference server not available")
            
            # Check disk space
            import shutil
            disk_usage = shutil.disk_usage("/models")
            free_gb = disk_usage.free / 1e9
            total_gb = disk_usage.total / 1e9
            logger.info(f"Disk space: {free_gb:.1f} GB free / {total_gb:.1f} GB total")
            
            if free_gb < 10:
                logger.warning("Low disk space! Consider cleaning up old checkpoints.")
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")

def main():
    """Main function for weekly training."""
    scheduler = WeeklyTrainingScheduler()
    
    # If run directly, execute training immediately
    if len(sys.argv) > 1 and sys.argv[1] == "--now":
        scheduler.run_weekly_training()
        return
    
    # If run with --health, run health check
    if len(sys.argv) > 1 and sys.argv[1] == "--health":
        scheduler.run_health_check()
        return
    
    # Otherwise, this is the cron job - run training
    scheduler.run_weekly_training()

if __name__ == "__main__":
    main()