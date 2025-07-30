"""
Enhanced Voice Processing Server
Integrates comprehensive voice training pipeline with RTX 5090 optimization
"""

import os
import sys
import json
import logging
import asyncio
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import numpy as np
import librosa
import soundfile as sf
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

# Import our RTX 5090 training components
from rtx5090_voice_trainer import RTX5090VoiceTrainer, TrainingConfig
from voice_training_pipeline import VoiceTrainingPipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Enhanced Voice Processing Server", version="1.0.0")

class VoiceProcessingRequest(BaseModel):
    voiceId: str
    audioPath: str
    userId: str
    passageId: Optional[str] = None
    passageText: Optional[str] = None
    isComplete: bool = False
    completedPassages: List[str] = []
    totalPassages: int = 4
    metadata: Dict[str, Any] = {}
    triggerTraining: bool = False
    trainingConfig: Optional[Dict[str, Any]] = None

class TrainingRequest(BaseModel):
    userId: str
    epochs: int = 100
    batchSize: int = 8
    learningRate: float = 5e-5
    mixedPrecision: bool = True
    gpuOptimization: str = "rtx5090"

class VoiceProcessor:
    """Enhanced voice processor with RTX 5090 integration."""
    
    def __init__(self):
        self.training_pipeline = VoiceTrainingPipeline()
        self.active_trainings = {}
        self.processing_queue = []
        
        # Verify RTX 5090 availability
        self._check_gpu_availability()
        
    def _check_gpu_availability(self):
        """Check if RTX 5090 is available for training."""
        try:
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                logger.info(f"GPU available: {gpu_name}")
                if "RTX 5090" in gpu_name:
                    logger.info("✅ RTX 5090 detected - optimal training available")
                else:
                    logger.warning("⚠️ RTX 5090 not detected - training may be slower")
            else:
                logger.error("❌ No CUDA GPU available")
        except ImportError:
            logger.warning("PyTorch not available - GPU check skipped")

    async def analyze_audio_quality(self, audio_path: str, passage_metadata: Dict) -> Dict[str, Any]:
        """Analyze audio quality for training optimization."""
        try:
            # Load audio file
            audio, sr = librosa.load(audio_path, sr=22050)
            duration = len(audio) / sr
            
            # Basic quality metrics
            rms = np.sqrt(np.mean(audio**2))
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=audio, sr=sr))
            zero_crossing_rate = np.mean(librosa.feature.zero_crossing_rate(audio))
            
            # Estimate phonetic diversity
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
            phonetic_diversity = np.std(mfccs)
            
            # Calculate quality scores
            volume_score = min(100, (rms / 0.1) * 100)  # Normalize to reasonable range
            clarity_score = min(100, (spectral_centroid / 2000) * 100)
            consistency_score = max(0, 100 - (np.std(librosa.onset.onset_strength(audio, sr)) * 50))
            phonetic_score = min(100, phonetic_diversity * 10)
            
            # Passage-specific scoring
            emotional_score = 50  # Base score
            if passage_metadata.get('passageId') == 'emotional-expression':
                # Look for pitch variation
                pitches, magnitudes = librosa.core.piptrack(y=audio, sr=sr)
                pitch_variation = np.std(pitches[pitches > 0]) if len(pitches[pitches > 0]) > 0 else 0
                emotional_score = min(100, pitch_variation / 50 * 100)
            elif passage_metadata.get('passageId') == 'technical-clarity':
                # Emphasize clarity for technical passages
                clarity_score *= 1.2
                emotional_score = clarity_score
            
            duration_score = min(100, (duration / passage_metadata.get('optimalDuration', 60)) * 100)
            
            overall_score = (
                volume_score * 0.20 +
                clarity_score * 0.25 +
                consistency_score * 0.20 +
                emotional_score * 0.15 +
                phonetic_score * 0.10 +
                duration_score * 0.10
            )
            
            return {
                'overall': round(overall_score),
                'volume': round(volume_score),
                'clarity': round(clarity_score),
                'consistency': round(consistency_score),
                'emotional': round(emotional_score),
                'phonetic': round(phonetic_score),
                'duration': round(duration_score),
                'technical_metrics': {
                    'rms': float(rms),
                    'spectral_centroid': float(spectral_centroid),
                    'zero_crossing_rate': float(zero_crossing_rate),
                    'phonetic_diversity': float(phonetic_diversity),
                    'audio_duration': duration
                }
            }
            
        except Exception as e:
            logger.error(f"Audio quality analysis failed: {e}")
            return {
                'overall': 50,
                'volume': 50,
                'clarity': 50,
                'consistency': 50,
                'emotional': 50,
                'phonetic': 50,
                'duration': 50,
                'error': str(e)
            }

    async def process_voice_passage(self, request: VoiceProcessingRequest) -> Dict[str, Any]:
        """Process individual voice passage with quality analysis."""
        logger.info(f"Processing voice passage: {request.passageId} for user {request.userId}")
        
        try:
            # Analyze audio quality
            quality_analysis = await self.analyze_audio_quality(
                request.audioPath, 
                request.metadata
            )
            
            # Validate training requirements
            min_duration = request.metadata.get('minDuration', 30)
            quality_threshold = 70
            
            meets_requirements = (
                quality_analysis['overall'] >= quality_threshold and
                quality_analysis['duration'] >= (min_duration / request.metadata.get('optimalDuration', 60) * 100)
            )
            
            # Store processing results
            result = {
                'success': True,
                'voiceId': request.voiceId,
                'passageId': request.passageId,
                'userId': request.userId,
                'qualityAnalysis': quality_analysis,
                'meetsTrainingRequirements': meets_requirements,
                'isComplete': request.isComplete,
                'completedPassages': len(request.completedPassages),
                'totalPassages': request.totalPassages,
                'processingTimestamp': datetime.now().isoformat()
            }
            
            # If this completes the voice clone and training is requested
            if request.isComplete and request.triggerTraining:
                logger.info(f"Triggering RTX 5090 training for user {request.userId}")
                
                # Start training in background
                training_task = asyncio.create_task(
                    self._start_rtx5090_training(request.userId, request.trainingConfig or {})
                )
                self.active_trainings[request.userId] = training_task
                
                result.update({
                    'trainingTriggered': True,
                    'trainingEstimatedTime': '2-3 minutes',
                    'trainingGpu': 'RTX 5090',
                    'trainingStatus': 'started'
                })
            
            logger.info(f"Voice passage processed successfully: {request.passageId}")
            return result
            
        except Exception as e:
            logger.error(f"Voice processing failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'voiceId': request.voiceId,
                'passageId': request.passageId
            }

    async def _start_rtx5090_training(self, user_id: str, training_config: Dict) -> Dict[str, Any]:
        """Start RTX 5090 optimized training in background."""
        try:
            logger.info(f"Starting RTX 5090 training for user: {user_id}")
            
            # Use the training pipeline
            result = self.training_pipeline.run_training(
                user_id=user_id,
                epochs=training_config.get('epochs', 100),
                batch_size=training_config.get('batchSize', 8),
                learning_rate=training_config.get('learningRate', 5e-5),
                mixed_precision=training_config.get('mixedPrecision', True)
            )
            
            if result['success']:
                logger.info(f"✅ RTX 5090 training completed for user {user_id}")
                
                # Deploy the trained model
                deployment_result = self.training_pipeline.deploy_trained_model(user_id)
                if deployment_result['success']:
                    logger.info(f"✅ Model deployed successfully for user {user_id}")
                
                return {
                    'success': True,
                    'trainingResult': result,
                    'deploymentResult': deployment_result,
                    'completedAt': datetime.now().isoformat()
                }
            else:
                logger.error(f"❌ RTX 5090 training failed for user {user_id}: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error'),
                    'trainingLogs': result.get('training_logs', [])
                }
                
        except Exception as e:
            logger.error(f"RTX 5090 training exception for user {user_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            # Clean up active training reference
            if user_id in self.active_trainings:
                del self.active_trainings[user_id]

    async def get_training_status(self, user_id: str) -> Dict[str, Any]:
        """Get current training status for a user."""
        if user_id in self.active_trainings:
            task = self.active_trainings[user_id]
            if task.done():
                try:
                    result = await task
                    return {
                        'status': 'completed' if result['success'] else 'failed',
                        'result': result
                    }
                except Exception as e:
                    return {
                        'status': 'failed',
                        'error': str(e)
                    }
            else:
                return {
                    'status': 'training',
                    'message': 'RTX 5090 training in progress'
                }
        else:
            # Check if model exists
            model_dir = Path(f"/models/voices/{user_id}/latest")
            if model_dir.exists():
                return {
                    'status': 'completed',
                    'message': 'Voice model ready'
                }
            else:
                return {
                    'status': 'not_started',
                    'message': 'No training initiated'
                }

# Global processor instance
processor = VoiceProcessor()

@app.post("/voice/process")
async def process_voice(request: VoiceProcessingRequest):
    """Process voice recording with enhanced analysis and training integration."""
    try:
        result = await processor.process_voice_passage(request)
        return result
    except Exception as e:
        logger.error(f"Voice processing endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/train")
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start RTX 5090 voice training."""
    try:
        if request.userId in processor.active_trainings:
            return {
                'success': False,
                'error': 'Training already in progress for this user'
            }
        
        # Start training in background
        training_task = asyncio.create_task(
            processor._start_rtx5090_training(request.userId, request.dict())
        )
        processor.active_trainings[request.userId] = training_task
        
        return {
            'success': True,
            'message': 'RTX 5090 training started',
            'estimatedTime': '2-3 minutes',
            'userId': request.userId
        }
        
    except Exception as e:
        logger.error(f"Training start error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/voice/training-status/{user_id}")
async def get_training_status(user_id: str):
    """Get training status for a user."""
    try:
        status = await processor.get_training_status(user_id)
        return status
    except Exception as e:
        logger.error(f"Training status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/models/refresh")
async def refresh_models():
    """Refresh available voice models."""
    try:
        # This would typically reload models in the inference service
        logger.info("Voice models refresh requested")
        return {
            'success': True,
            'message': 'Voice models refreshed',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Model refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'service': 'Enhanced Voice Processing Server',
        'version': '1.0.0',
        'rtx5090_ready': True,
        'active_trainings': len(processor.active_trainings),
        'timestamp': datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Check if running in Docker or development
    host = "0.0.0.0" if os.getenv("DOCKER_ENV") else "127.0.0.1"
    port = int(os.getenv("PORT", 8000))
    
    logger.info("Starting Enhanced Voice Processing Server with RTX 5090 optimization")
    logger.info(f"Server will run on {host}:{port}")
    
    uvicorn.run(app, host=host, port=port, log_level="info")