#!/usr/bin/env python3
"""
Hybrid Voice Training Pipeline
Complete automation from local voice recordings to deployed fine-tuned models
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import threading
import schedule
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
import requests
import webbrowser

# Import our custom modules
try:
    from secure_transfer import SecureVoiceTransfer
    from cloud_training_client import CloudTrainingClient
    from model_manager import VoiceModelManager
    MODULES_AVAILABLE = True
except ImportError as e:
    MODULES_AVAILABLE = False
    logging.error(f"Required modules not available: {e}")

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HybridVoiceTrainingPipeline:
    def __init__(self, config_path: str = None):
        if not MODULES_AVAILABLE:
            raise ImportError("Required modules not available. Check imports.")
        
        self.config = self._load_config(config_path)
        self.transfer_system = SecureVoiceTransfer(self.config.get("voice_dir"))
        self.cloud_client = CloudTrainingClient()
        self.model_manager = VoiceModelManager(self.config.get("models_dir"))
        
        self.pipeline_state = {
            "status": "idle",
            "current_user": None,
            "current_job": None,
            "last_run": None,
            "jobs_queue": [],
            "active_jobs": {}
        }
        
        # Status tracking
        self.status_file = Path(self.config.get("status_file", "/tmp/voice_pipeline_status.json"))
        self.load_pipeline_state()
    
    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load pipeline configuration."""
        default_config = {
            "voice_dir": "/home/luke/personal-ai-clone/web/public/voices",
            "models_dir": "/models/voices",
            "status_file": "/tmp/voice_pipeline_status.json",
            "auto_training": {
                "enabled": True,
                "schedule": "weekly",  # daily, weekly, monthly
                "min_voice_files": 3,
                "min_audio_duration": 60  # seconds
            },
            "cloud_platforms": {
                "preferred": "colab",  # colab, kaggle
                "fallback": "kaggle"
            },
            "quality_thresholds": {
                "min_quality_score": 0.7,
                "min_training_samples": 5,
                "max_model_age_days": 30
            },
            "notifications": {
                "enabled": True,
                "webhook_url": None,
                "email": None
            }
        }
        
        if config_path and Path(config_path).exists():
            with open(config_path, 'r') as f:
                user_config = json.load(f)
            default_config.update(user_config)
        
        return default_config
    
    def save_pipeline_state(self):
        """Save current pipeline state to file."""
        try:
            with open(self.status_file, 'w') as f:
                json.dump(self.pipeline_state, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save pipeline state: {e}")
    
    def load_pipeline_state(self):
        """Load pipeline state from file."""
        try:
            if self.status_file.exists():
                with open(self.status_file, 'r') as f:
                    saved_state = json.load(f)
                self.pipeline_state.update(saved_state)
        except Exception as e:
            logger.error(f"Failed to load pipeline state: {e}")
    
    def discover_training_candidates(self) -> List[Dict[str, Any]]:
        """Discover users/voice data that could benefit from training."""
        candidates = []
        
        try:
            voice_dir = Path(self.config["voice_dir"])
            if not voice_dir.exists():
                logger.warning("Voice directory not found")
                return candidates
            
            for user_dir in voice_dir.iterdir():
                if not user_dir.is_dir():
                    continue
                
                user_id = user_dir.name
                
                # Analyze voice files
                voice_files = []
                for pattern in ["*.wav", "*.webm", "*.mp3"]:
                    voice_files.extend(user_dir.glob(pattern))
                
                if len(voice_files) < self.config["auto_training"]["min_voice_files"]:
                    continue
                
                # Calculate total audio duration (estimated)
                total_duration = len(voice_files) * 10  # Rough estimate: 10s per file
                
                if total_duration < self.config["auto_training"]["min_audio_duration"]:
                    continue
                
                # Check if user has recent models
                recent_models = self.model_manager.list_models(user_id)
                
                # Filter for recent models
                cutoff_date = datetime.now() - timedelta(days=self.config["quality_thresholds"]["max_model_age_days"])
                recent_models = [
                    m for m in recent_models 
                    if datetime.fromisoformat(m["created_at"]) > cutoff_date
                ]
                
                candidate_info = {
                    "user_id": user_id,
                    "voice_files_count": len(voice_files),
                    "estimated_duration": total_duration,
                    "recent_models_count": len(recent_models),
                    "needs_training": len(recent_models) == 0,
                    "last_model_date": recent_models[0]["created_at"] if recent_models else None,
                    "priority": self._calculate_training_priority(user_id, voice_files, recent_models)
                }
                
                candidates.append(candidate_info)
            
            # Sort by priority
            candidates.sort(key=lambda x: x["priority"], reverse=True)
            
            logger.info(f"Found {len(candidates)} training candidates")
            return candidates
            
        except Exception as e:
            logger.error(f"Failed to discover training candidates: {e}")
            return candidates
    
    def _calculate_training_priority(self, user_id: str, voice_files: List, recent_models: List) -> float:
        """Calculate training priority score (0-1)."""
        priority = 0.0
        
        # More voice files = higher priority
        priority += min(len(voice_files) / 20.0, 0.3)
        
        # No recent models = high priority
        if not recent_models:
            priority += 0.4
        else:
            # Older models = higher priority for refresh
            latest_model_date = datetime.fromisoformat(recent_models[0]["created_at"])
            days_old = (datetime.now() - latest_model_date).days
            priority += min(days_old / 30.0, 0.2)
        
        # Usage-based priority (from model manager)
        usage_stats = self.model_manager.get_usage_stats(days=7)
        user_models = [m for m in usage_stats.get("models", []) if user_id in m["model_id"]]
        if user_models:
            avg_usage = sum(m["usage_count"] for m in user_models) / len(user_models)
            priority += min(avg_usage / 10.0, 0.1)
        
        return min(priority, 1.0)
    
    def start_training_pipeline(self, user_id: str, platform: str = None) -> Dict[str, Any]:
        """Start complete training pipeline for a user."""
        try:
            logger.info(f"🚀 Starting training pipeline for {user_id}")
            
            if not platform:
                platform = self.config["cloud_platforms"]["preferred"]
            
            # Update pipeline state
            job_id = f"train_{user_id}_{int(time.time())}"
            self.pipeline_state["status"] = "training"
            self.pipeline_state["current_user"] = user_id
            self.pipeline_state["current_job"] = job_id
            
            job_info = {
                "job_id": job_id,
                "user_id": user_id,
                "platform": platform,
                "started_at": datetime.now().isoformat(),
                "status": "preparing",
                "steps": {
                    "prepare_data": {"status": "pending"},
                    "upload_to_cloud": {"status": "pending"},
                    "train_model": {"status": "pending"},
                    "download_model": {"status": "pending"},
                    "deploy_model": {"status": "pending"}
                }
            }
            
            self.pipeline_state["active_jobs"][job_id] = job_info
            self.save_pipeline_state()
            
            # Step 1: Prepare training data
            logger.info("📦 Step 1: Preparing training data...")\n            job_info["steps"]["prepare_data"]["status"] = "in_progress"\n            self.save_pipeline_state()\n            \n            package_path = self.cloud_client.prepare_training_package(user_id)\n            if not package_path:\n                job_info["status"] = "failed"\n                job_info["error"] = "Failed to prepare training package"\n                self.save_pipeline_state()\n                return {"success": False, "error": "Failed to prepare training package"}\n            \n            job_info["steps"]["prepare_data"]["status"] = "completed"\n            job_info["package_path"] = str(package_path)\n            \n            # Step 2: Upload to cloud platform\n            logger.info(f"📤 Step 2: Uploading to {platform}...")\n            job_info["steps"]["upload_to_cloud"]["status"] = "in_progress"\n            self.save_pipeline_state()\n            \n            if platform == "colab":\n                upload_success = self.cloud_client.upload_to_colab(package_path, user_id)\n                colab_url = self.cloud_client.generate_colab_url(user_id)\n                job_info["training_url"] = colab_url\n            elif platform == "kaggle":\n                upload_success = self.cloud_client.upload_to_kaggle(package_path, user_id)\n            else:\n                upload_success = False\n                job_info["error"] = f"Unsupported platform: {platform}"\n            \n            if not upload_success:\n                job_info["status"] = "failed"\n                job_info["error"] = f"Failed to upload to {platform}"\n                self.save_pipeline_state()\n                return {"success": False, "error": f"Failed to upload to {platform}"}\n            \n            job_info["steps"]["upload_to_cloud"]["status"] = "completed"\n            job_info["steps"]["train_model"]["status"] = "waiting_for_user"\n            job_info["status"] = "training_ready"\n            \n            # Provide instructions to user\n            training_instructions = self._generate_training_instructions(job_info)\n            job_info["instructions"] = training_instructions\n            \n            self.save_pipeline_state()\n            \n            # Send notification\n            self._send_notification(\n                f"Training ready for {user_id}",\n                f"Cloud training setup complete. Please follow the instructions to start training."\n            )\n            \n            logger.info("✅ Training pipeline prepared successfully")\n            \n            return {\n                "success": True,\n                "job_id": job_id,\n                "status": "training_ready",\n                "instructions": training_instructions,\n                "training_url": job_info.get("training_url")\n            }\n            \n        except Exception as e:\n            logger.error(f"Training pipeline failed: {e}")\n            \n            if 'job_info' in locals():\n                job_info["status"] = "failed"\n                job_info["error"] = str(e)\n                self.save_pipeline_state()\n            \n            return {"success": False, "error": str(e)}\n    \n    def _generate_training_instructions(self, job_info: Dict[str, Any]) -> List[str]:\n        """Generate step-by-step training instructions for the user.\"\"\"\n        platform = job_info["platform"]\n        user_id = job_info["user_id"]\n        \n        if platform == "colab":\n            instructions = [\n                f"1. Open Google Colab notebook: {job_info.get('training_url', 'hybrid_voice_training_colab.ipynb')}",\n                "2. Run the setup cells to install dependencies",\n                f"3. Upload the prepared voice package when prompted",\n                "4. Run the training pipeline cells",\n                "5. Training will take 30-90 minutes depending on data size",\n                "6. Download the trained model when complete",\n                f"7. Use the integration script to deploy: python hybrid_pipeline.py complete-training --job-id {job_info['job_id']} --model-file <downloaded_file>"\n            ]\n        elif platform == "kaggle":\n            instructions = [\n                "1. Open Kaggle and create a new notebook",\n                "2. Add the uploaded dataset to your notebook",\n                "3. Copy the training code from hybrid_voice_training_colab.ipynb",\n                "4. Run the training pipeline",\n                "5. Download the trained model from notebook output",\n                f"6. Use: python hybrid_pipeline.py complete-training --job-id {job_info['job_id']} --model-file <downloaded_file>"\n            ]\n        else:\n            instructions = ["Platform not supported"]\n        \n        return instructions\n    \n    def complete_training_pipeline(self, job_id: str, model_file_path: str) -> Dict[str, Any]:\n        """Complete the training pipeline after model download.\"\"\"\n        try:\n            if job_id not in self.pipeline_state["active_jobs"]:\n                return {"success": False, "error": "Job not found"}\n            \n            job_info = self.pipeline_state["active_jobs"][job_id]\n            user_id = job_info["user_id"]\n            \n            logger.info(f"🎯 Completing training pipeline for job {job_id}")\n            \n            # Step 4: Process downloaded model\n            logger.info("📥 Step 4: Processing downloaded model...")\n            job_info["steps"]["download_model"]["status"] = "in_progress"\n            self.save_pipeline_state()\n            \n            success = self.cloud_client.download_trained_model(model_file_path, user_id)\n            if not success:\n                job_info["status"] = "failed"\n                job_info["error"] = "Failed to process downloaded model"\n                self.save_pipeline_state()\n                return {"success": False, "error": "Failed to process downloaded model"}\n            \n            job_info["steps"]["download_model"]["status"] = "completed"\n            \n            # Step 5: Deploy model and update voice cloner\n            logger.info("🚀 Step 5: Deploying model...")\n            job_info["steps"]["deploy_model"]["status"] = "in_progress"\n            self.save_pipeline_state()\n            \n            # Register model with model manager\n            model_metadata = {\n                "training_platform": job_info["platform"],\n                "job_id": job_id,\n                "pipeline_version": "hybrid_v1"\n            }\n            \n            # Find the newly installed model\n            models = self.model_manager.list_models(user_id)\n            if models:\n                latest_model = models[0]  # Most recent\n                model_id = latest_model["model_id"]\n                \n                # Evaluate the new model\n                evaluation_result = self.model_manager.evaluate_model(model_id, "quality_check")\n                \n                if evaluation_result["success"]:\n                    quality_score = evaluation_result["evaluation"]["overall_score"]\n                    job_info["quality_score"] = quality_score\n                    \n                    if quality_score < self.config["quality_thresholds"]["min_quality_score"]:\n                        logger.warning(f"Model quality below threshold: {quality_score}")\n                        job_info["warnings"] = ["Model quality below recommended threshold"]\n            \n            # Restart inference server to load new model\n            restart_success = self.cloud_client.restart_inference_server()\n            \n            job_info["steps"]["deploy_model"]["status"] = "completed"\n            job_info["status"] = "completed"\n            job_info["completed_at"] = datetime.now().isoformat()\n            \n            # Clean up\n            self.pipeline_state["status"] = "idle"\n            self.pipeline_state["current_user"] = None\n            self.pipeline_state["current_job"] = None\n            self.pipeline_state["last_run"] = datetime.now().isoformat()\n            \n            self.save_pipeline_state()\n            \n            # Send completion notification\n            self._send_notification(\n                f"Training completed for {user_id}",\n                f"New voice model deployed successfully. Quality score: {job_info.get('quality_score', 'N/A')}\"\n            )\n            \n            logger.info("🎉 Training pipeline completed successfully!")\n            \n            return {\n                "success": True,\n                "job_id": job_id,\n                "model_id": model_id if 'model_id' in locals() else None,\n                "quality_score": job_info.get("quality_score"),\n                "inference_server_restarted": restart_success\n            }\n            \n        except Exception as e:\n            logger.error(f"Failed to complete training pipeline: {e}")\n            \n            if job_id in self.pipeline_state["active_jobs"]:\n                self.pipeline_state["active_jobs"][job_id]["status"] = "failed"\n                self.pipeline_state["active_jobs"][job_id]["error"] = str(e)\n                self.save_pipeline_state()\n            \n            return {"success": False, "error": str(e)}\n    \n    def schedule_auto_training(self):\n        \"\"\"Set up automatic training schedule.\"\"\"\n        if not self.config["auto_training"]["enabled"]:\n            logger.info("Auto-training disabled in config")\n            return\n        \n        schedule_type = self.config["auto_training"]["schedule"]\n        \n        if schedule_type == "daily":\n            schedule.every().day.at("03:00").do(self.run_auto_training)\n        elif schedule_type == "weekly":\n            schedule.every().sunday.at("03:00").do(self.run_auto_training)\n        elif schedule_type == "monthly":\n            schedule.every().month.do(self.run_auto_training)\n        \n        logger.info(f"Auto-training scheduled: {schedule_type}")\n    \n    def run_auto_training(self):\n        \"\"\"Run automatic training for eligible users.\"\"\"\n        try:\n            logger.info("🔄 Running automatic training check...")\n            \n            if self.pipeline_state["status"] != "idle":\n                logger.info("Pipeline busy, skipping auto-training")\n                return\n            \n            candidates = self.discover_training_candidates()\n            high_priority_candidates = [c for c in candidates if c["priority"] > 0.7]\n            \n            if not high_priority_candidates:\n                logger.info("No high-priority training candidates found")\n                return\n            \n            # Train the highest priority candidate\n            top_candidate = high_priority_candidates[0]\n            user_id = top_candidate["user_id"]\n            \n            logger.info(f"🎯 Auto-training selected: {user_id} (priority: {top_candidate['priority']:.2f})")\n            \n            result = self.start_training_pipeline(user_id)\n            \n            if result["success"]:\n                logger.info(f"✅ Auto-training pipeline started for {user_id}")\n            else:\n                logger.error(f"❌ Auto-training failed for {user_id}: {result['error']}")\n            \n        except Exception as e:\n            logger.error(f"Auto-training error: {e}")\n    \n    def _send_notification(self, title: str, message: str):\n        \"\"\"Send notification about pipeline events.\"\"\"\n        if not self.config["notifications"]["enabled"]:\n            return\n        \n        try:\n            webhook_url = self.config["notifications"].get("webhook_url")\n            if webhook_url:\n                payload = {\n                    "title": title,\n                    "message": message,\n                    "timestamp": datetime.now().isoformat(),\n                    "service": "voice_training_pipeline"\n                }\n                requests.post(webhook_url, json=payload, timeout=10)\n            \n            # Log notification\n            logger.info(f"📢 Notification: {title} - {message}")\n            \n        except Exception as e:\n            logger.error(f"Failed to send notification: {e}")\n    \n    def get_pipeline_status(self) -> Dict[str, Any]:\n        \"\"\"Get current pipeline status and job information.\"\"\"\n        return {\n            "pipeline_state": self.pipeline_state,\n            "config": self.config,\n            "training_candidates": self.discover_training_candidates(),\n            "recent_models": self.model_manager.list_models()[:10],\n            "system_status": {\n                "voice_cloner_healthy": self._check_voice_cloner_health(),\n                "models_dir_size": self._get_directory_size(self.config["models_dir"]),\n                "voice_files_count": self._count_voice_files()\n            }\n        }\n    \n    def _check_voice_cloner_health(self) -> bool:\n        \"\"\"Check if voice cloner service is healthy.\"\"\"\n        try:\n            response = requests.get("http://localhost:8000/voice/status", timeout=5)\n            return response.status_code == 200\n        except:\n            return False\n    \n    def _get_directory_size(self, path: str) -> float:\n        \"\"\"Get directory size in MB.\"\"\"\n        try:\n            total_size = sum(\n                f.stat().st_size for f in Path(path).rglob('*') if f.is_file()\n            )\n            return total_size / 1e6\n        except:\n            return 0.0\n    \n    def _count_voice_files(self) -> int:\n        \"\"\"Count total voice files across all users.\"\"\"\n        try:\n            voice_dir = Path(self.config["voice_dir"])\n            count = 0\n            for pattern in ["*.wav", "*.webm", "*.mp3"]:\n                count += len(list(voice_dir.rglob(pattern)))\n            return count\n        except:\n            return 0\n    \n    def run_monitoring_loop(self):\n        \"\"\"Run the main monitoring and scheduling loop.\"\"\"\n        logger.info("🚀 Starting hybrid voice training pipeline...")\n        \n        # Set up scheduled tasks\n        self.schedule_auto_training()\n        \n        try:\n            while True:\n                # Run scheduled tasks\n                schedule.run_pending()\n                \n                # Sleep for a minute\n                time.sleep(60)\n                \n        except KeyboardInterrupt:\n            logger.info("\\n🛑 Pipeline stopped by user")\n        except Exception as e:\n            logger.error(f"Pipeline monitoring error: {e}")\n\ndef main():\n    \"\"\"Command line interface for the hybrid pipeline.\"\"\"\n    import argparse\n    \n    parser = argparse.ArgumentParser(description="Hybrid Voice Training Pipeline")\n    parser.add_argument("command", \n                       choices=["start", "complete-training", "status", "discover", "monitor", "auto-train"],\n                       help="Command to execute")\n    parser.add_argument("--user-id", help="User ID for training")\n    parser.add_argument("--platform", choices=["colab", "kaggle"], help="Cloud platform")\n    parser.add_argument("--job-id", help="Job ID for completion")\n    parser.add_argument("--model-file", help="Path to downloaded model file")\n    parser.add_argument("--config", help="Path to configuration file")\n    \n    args = parser.parse_args()\n    \n    try:\n        pipeline = HybridVoiceTrainingPipeline(args.config)\n        \n        if args.command == "start":\n            if not args.user_id:\n                print("❌ --user-id required for start command")\n                return\n            \n            print(f"🚀 Starting training pipeline for {args.user_id}...")\n            result = pipeline.start_training_pipeline(args.user_id, args.platform)\n            \n            if result["success"]:\n                print("✅ Training pipeline started successfully!")\n                print(f"Job ID: {result['job_id']}")\n                print("\\n📋 Instructions:")\n                for instruction in result.get("instructions", []):\n                    print(f"  {instruction}")\n                \n                if result.get("training_url"):\n                    print(f"\\n🔗 Training URL: {result['training_url']}")\n                    # Auto-open browser\n                    try:\n                        webbrowser.open(result['training_url'])\n                    except:\n                        pass\n            else:\n                print(f"❌ Failed to start training: {result['error']}")\n        \n        elif args.command == "complete-training":\n            if not args.job_id or not args.model_file:\n                print("❌ --job-id and --model-file required for complete-training command")\n                return\n            \n            print(f"🎯 Completing training for job {args.job_id}...")\n            result = pipeline.complete_training_pipeline(args.job_id, args.model_file)\n            \n            if result["success"]:\n                print("🎉 Training completed successfully!")\n                print(f"Model ID: {result.get('model_id', 'N/A')}")\n                print(f"Quality Score: {result.get('quality_score', 'N/A')}")\n                print(f"Inference Server Restarted: {result.get('inference_server_restarted', False)}")\n            else:\n                print(f"❌ Failed to complete training: {result['error']}")\n        \n        elif args.command == "status":\n            status = pipeline.get_pipeline_status()\n            print(\"🔍 Pipeline Status:\")\n            print(f\"  Current Status: {status['pipeline_state']['status']}\")\n            print(f\"  Current User: {status['pipeline_state'].get('current_user', 'None')}\")\n            print(f\"  Active Jobs: {len(status['pipeline_state']['active_jobs'])}\")\n            print(f\"  Last Run: {status['pipeline_state'].get('last_run', 'Never')}\")\n            \n            print(f\"\\n📊 System Status:\")\n            system = status['system_status']\n            print(f\"  Voice Cloner Healthy: {system['voice_cloner_healthy']}\")\n            print(f\"  Models Directory Size: {system['models_dir_size']:.1f} MB\")\n            print(f\"  Total Voice Files: {system['voice_files_count']}\")\n            \n            candidates = status['training_candidates']\n            print(f\"\\n🎯 Training Candidates: {len(candidates)}\")\n            for candidate in candidates[:5]:\n                print(f\"  {candidate['user_id']}: Priority {candidate['priority']:.2f} ({candidate['voice_files_count']} files)\")\n        \n        elif args.command == "discover":\n            candidates = pipeline.discover_training_candidates()\n            print(f\"🔍 Found {len(candidates)} training candidates:\")\n            \n            for candidate in candidates:\n                print(f\"\\n👤 {candidate['user_id']}:\")\n                print(f\"  Voice Files: {candidate['voice_files_count']}\")\n                print(f\"  Duration: ~{candidate['estimated_duration']}s\")\n                print(f\"  Recent Models: {candidate['recent_models_count']}\")\n                print(f\"  Priority: {candidate['priority']:.2f}\")\n                print(f\"  Needs Training: {candidate['needs_training']}\")\n        \n        elif args.command == "auto-train":\n            print("🔄 Running auto-training check...")\n            pipeline.run_auto_training()\n        \n        elif args.command == "monitor":\n            print("🔍 Starting monitoring mode (Ctrl+C to stop)...")\n            pipeline.run_monitoring_loop()\n    \n    except Exception as e:\n        logger.error(f"Pipeline error: {e}")\n        print(f"❌ Pipeline error: {e}")\n\nif __name__ == "__main__":\n    main()\n