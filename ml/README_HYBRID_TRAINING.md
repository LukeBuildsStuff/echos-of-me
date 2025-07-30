# Hybrid Voice Training Pipeline

A complete system for training high-quality voice clones using free cloud GPUs while keeping all voice data secure on your local RTX 5090 system.

## Overview

This hybrid pipeline bypasses RTX 5090 CUDA sm_120 compatibility issues by using free Google Colab/Kaggle GPUs for training while maintaining complete data security and model ownership.

### Key Features

- **Secure Data Transfer**: Voice recordings encrypted before cloud upload
- **Cloud Training**: Free T4/A100 GPUs for XTTS-v2 fine-tuning
- **Local Deployment**: Trained models deployed on RTX 5090 for fast inference
- **Version Management**: Complete model lifecycle and quality tracking
- **Automated Pipeline**: From voice recordings to deployed models

## Architecture

```
Local RTX 5090 System          Cloud Training Platform       Local RTX 5090 System
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ Voice Recordings    │  -->  │ Encrypted Upload    │  -->  │ Trained Model       │
│ /web/public/voices/ │       │ XTTS-v2 Training   │       │ /models/voices/     │
│                     │       │ T4/A100 GPU        │       │                     │
│ Secure Transfer     │  <--  │ Encrypted Download  │  <--  │ Model Deployment    │
│ Model Management    │       │ Model Packaging     │       │ RTX 5090 Inference │
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd /home/luke/personal-ai-clone/ml
pip install cryptography requests flask schedule
```

### 2. Prepare Voice Data

Ensure you have voice recordings in `/web/public/voices/lukemoeller_yahoo_com/`:

```bash
# Check your voice files
ls -la /home/luke/personal-ai-clone/web/public/voices/lukemoeller_yahoo_com/
```

You should have:
- At least 3-5 voice files
- Minimum 60 seconds total audio
- WAV, WebM, or MP3 formats

### 3. Start Training Pipeline

```bash
# Start training for your user
python hybrid_pipeline.py start --user-id lukemoeller_yahoo_com --platform colab

# This will:
# 1. Package and encrypt your voice data
# 2. Prepare Google Colab notebook
# 3. Provide step-by-step instructions
```

### 4. Cloud Training (Manual Step)

1. Open the provided Google Colab URL
2. Run setup cells to install dependencies
3. Upload your encrypted voice package
4. Run training pipeline (30-90 minutes)
5. Download the trained model

### 5. Deploy Trained Model

```bash
# Complete the pipeline with downloaded model
python hybrid_pipeline.py complete-training --job-id <job_id> --model-file <downloaded_model.zip>

# This will:
# 1. Decrypt and install the model
# 2. Update voice cloner to use new model
# 3. Restart inference server
```

## Detailed Workflow

### Phase 1: Data Preparation

1. **Voice Discovery**: System scans `/web/public/voices/` for training candidates
2. **Quality Check**: Validates audio duration, format, and quality
3. **Data Packaging**: Creates training dataset with metadata
4. **Encryption**: Secures voice data with Fernet encryption

### Phase 2: Cloud Training

1. **Platform Selection**: Choose Google Colab (free T4) or Kaggle (free P100/T4)
2. **Secure Upload**: Transfer encrypted voice package
3. **XTTS-v2 Fine-tuning**: Train personalized voice model
4. **Quality Validation**: Automated quality assessment
5. **Model Packaging**: Prepare model for download

### Phase 3: Local Deployment

1. **Secure Download**: Retrieve encrypted trained model
2. **Model Installation**: Deploy to `/models/voices/`
3. **Version Management**: Register in model database
4. **Integration**: Update voice cloner and restart services
5. **Quality Assessment**: Evaluate and log model performance

## File Structure

```
/home/luke/personal-ai-clone/ml/
├── hybrid_voice_training_colab.ipynb    # Google Colab training notebook
├── secure_transfer.py                   # Encrypted data transfer system
├── cloud_training_client.py             # Cloud platform automation
├── voice_cloner.py                      # Enhanced with external model support
├── model_manager.py                     # Version control and quality tracking
├── hybrid_pipeline.py                   # Complete automation pipeline
└── README_HYBRID_TRAINING.md           # This documentation

/models/voices/                          # Trained models storage
├── lukemoeller_yahoo_com/
│   ├── latest -> xtts_v2_lukemoeller_yahoo_com_1705123456/
│   ├── xtts_v2_lukemoeller_yahoo_com_1705123456/
│   │   ├── metadata.json
│   │   ├── model.pth
│   │   └── config.json
│   └── archived/
└── model_registry.db                   # Model tracking database
```

## Command Reference

### Pipeline Commands

```bash
# Start training pipeline
python hybrid_pipeline.py start --user-id <user_id> [--platform colab|kaggle]

# Complete training after download
python hybrid_pipeline.py complete-training --job-id <job_id> --model-file <path>

# Check pipeline status
python hybrid_pipeline.py status

# Discover training candidates
python hybrid_pipeline.py discover

# Run auto-training check
python hybrid_pipeline.py auto-train

# Start monitoring mode
python hybrid_pipeline.py monitor
```

### Model Management

```bash
# List models
python model_manager.py list [--user-id <user_id>]

# Get model information
python model_manager.py info --model-id <model_id>

# Evaluate model quality
python model_manager.py evaluate --model-id <model_id> [--evaluation-type quality_check]

# Archive old model
python model_manager.py archive --model-id <model_id>

# Get usage statistics
python model_manager.py stats [--model-id <model_id>] [--days 30]

# Cleanup old models
python model_manager.py cleanup [--days 90]
```

### Data Transfer

```bash
# Start secure transfer server
python secure_transfer.py server [--port 8080] [--host 127.0.0.1]

# Package voice data
python secure_transfer.py package --user-id <user_id> [--password <password>]

# Generate encryption key
python secure_transfer.py encrypt --user-id <user_id> [--password <password>]
```

### Cloud Training Client

```bash
# Prepare training package
python cloud_training_client.py prepare --user-id <user_id> [--platform colab]

# Monitor training progress
python cloud_training_client.py monitor --platform colab

# Process downloaded model
python cloud_training_client.py download --user-id <user_id> --download-path <path>
```

## Configuration

Create a configuration file at `/home/luke/personal-ai-clone/ml/pipeline_config.json`:

```json
{
  "voice_dir": "/home/luke/personal-ai-clone/web/public/voices",
  "models_dir": "/models/voices",
  "auto_training": {
    "enabled": true,
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
    "enabled": true,
    "webhook_url": null
  }
}
```

## API Endpoints

The enhanced inference server provides new endpoints for model management:

```
GET  /voice/models                    # List all external models
GET  /voice/models/{user_id}          # List user's models
POST /voice/models/load               # Load specific model
POST /voice/models/reload-base        # Reload base XTTS-v2
POST /voice/models/refresh            # Refresh model discovery
```

## Quality Assessment

Models are automatically evaluated on:

1. **Voice Similarity**: How closely the synthetic voice matches the original
2. **Naturalness**: How human-like and conversational the speech sounds
3. **Emotional Expression**: Ability to convey emotions and prosody
4. **Performance**: Synthesis speed and resource usage
5. **Consistency**: Reliability across different text inputs

Quality scores range from 0.0 to 1.0, with 0.7+ considered good quality.

## Security Features

- **End-to-End Encryption**: Voice data encrypted before cloud upload
- **Temporary Storage**: Cloud platforms never permanently store voice data
- **Secure Deletion**: All temporary files securely wiped after training
- **Key Management**: Encryption keys stored only on local system
- **Access Control**: User-specific model isolation

## Troubleshooting

### Common Issues

**1. Training Package Creation Fails**
```bash
# Check voice file permissions
ls -la /home/luke/personal-ai-clone/web/public/voices/lukemoeller_yahoo_com/

# Verify audio files are valid
python -c "import librosa; print(librosa.load('voice_file.wav'))"
```

**2. Cloud Training Issues**
- Check Google Colab GPU availability (may be limited on free tier)
- Verify internet connection for uploads/downloads
- Try alternative platform (Kaggle) if Colab unavailable

**3. Model Deployment Problems**
```bash
# Check model directory permissions
sudo chown -R luke:luke /models/voices/

# Verify inference server is running
curl http://localhost:8000/health

# Check model registry database
python model_manager.py list
```

**4. Performance Issues**
```bash
# Monitor GPU usage
nvidia-smi

# Check Docker container resources
docker stats personal-ai-clone-ml-inference-1

# Review inference server logs
docker logs personal-ai-clone-ml-inference-1
```

### Validation Scripts

```bash
# Test voice cloner functionality
python voice_cloner.py

# Validate model manager
python model_manager.py list

# Check pipeline status
python hybrid_pipeline.py status

# Test API endpoints
curl http://localhost:8000/voice/status
curl http://localhost:8000/voice/models
```

## Performance Optimization

### For Training (Cloud)

- **Colab Pro**: Consider upgrading for faster GPUs and longer runtimes
- **Data Quality**: Higher quality voice recordings = better models
- **Training Time**: 50-100 epochs typically optimal for voice cloning
- **Batch Size**: Adjust based on available GPU memory

### For Inference (Local RTX 5090)

- **Model Caching**: Pre-load frequently used models
- **Batch Processing**: Process multiple synthesis requests together
- **Memory Management**: Monitor VRAM usage, clear cache when needed
- **Quality vs Speed**: Balance quality settings for use case

## Automated Training

The pipeline supports automated training based on:

1. **Voice Data Availability**: New recordings trigger training consideration
2. **Model Age**: Refresh models older than configured threshold
3. **Usage Patterns**: Frequently used voices get priority for updates
4. **Quality Metrics**: Poor-performing models scheduled for retraining

Configure auto-training in the pipeline configuration file and run:

```bash
# Start monitoring mode for automated training
python hybrid_pipeline.py monitor
```

## Integration with Personal AI Clone

The hybrid training system seamlessly integrates with your existing Personal AI Clone:

1. **Voice Discovery**: Automatically detects new voice recordings from web interface
2. **Model Updates**: Newly trained models immediately available for synthesis
3. **API Compatibility**: All existing voice synthesis endpoints work unchanged
4. **Quality Improvements**: Users experience better voice quality without intervention

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review training candidates and model quality
2. **Monthly**: Clean up old models and archived data
3. **Quarterly**: Evaluate system performance and update configurations

### Monitoring

```bash
# Check system health
python hybrid_pipeline.py status

# Review recent model performance
python model_manager.py stats --days 7

# Monitor disk usage
df -h /models/voices/
```

### Backup and Recovery

```bash
# Backup model registry
cp /models/voices/model_registry.db /backup/

# Backup trained models
tar -czf /backup/voice_models_$(date +%Y%m%d).tar.gz /models/voices/

# Restore model
python model_manager.py register --model-path /backup/model/ --user-id <user_id>
```

## Advanced Usage

### Custom Training Parameters

Modify the Google Colab notebook to adjust:

- **Learning Rate**: Default 5e-6, increase for faster convergence
- **Epochs**: Default 100, adjust based on data amount
- **Batch Size**: Default 2, increase if GPU memory allows
- **Validation Split**: Default 10%, adjust for data size

### Multi-User Training

```bash
# Train models for multiple users
for user in user1 user2 user3; do
  python hybrid_pipeline.py start --user-id $user
done
```

### Integration with CI/CD

```yaml
# Example GitHub Actions workflow
name: Voice Model Training
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday
jobs:
  train:
    runs-on: self-hosted
    steps:
      - name: Run Auto Training
        run: python /home/luke/personal-ai-clone/ml/hybrid_pipeline.py auto-train
```

## Conclusion

The Hybrid Voice Training Pipeline provides a complete solution for high-quality voice cloning that:

- Leverages free cloud GPUs for training
- Maintains complete data security and privacy
- Produces models optimized for your RTX 5090
- Automates the entire workflow from recordings to deployment
- Provides comprehensive quality and performance monitoring

This system enables continuous improvement of your Personal AI Clone's voice capabilities without the limitations of local CUDA compatibility issues.