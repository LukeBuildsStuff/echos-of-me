# RTX 5090 Voice Training Solution

A complete local voice training solution optimized for your RTX 5090 setup, leveraging the proven NVIDIA container approach that resolved your sm_120 architecture compatibility issues.

## 🎯 Overview

This solution provides:
- **Local Training**: No cloud dependencies, uses your RTX 5090 directly
- **NVIDIA Container Approach**: Uses the proven `nvcr.io/nvidia/pytorch:25.04-py3` container
- **XTTS-v2 Fine-tuning**: Advanced voice cloning with your existing voice recordings
- **Automated Pipeline**: Complete end-to-end workflow with progress monitoring
- **Integration**: Seamlessly integrates with your existing voice inference service

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd /home/luke/personal-ai-clone/ml
./start_rtx5090_voice_training.sh setup
```

This will:
- Install required Python dependencies
- Build the RTX 5090 optimized training container
- Verify your GPU setup

### 2. Analyze Your Voice Data

```bash
./start_rtx5090_voice_training.sh analyze --user_id lukemoeller_yahoo_com
```

This analyzes your existing voice recordings and provides recommendations.

### 3. Start Training

```bash
./start_rtx5090_voice_training.sh train --user_id lukemoeller_yahoo_com
```

This runs the complete training pipeline:
- Data preprocessing and quality enhancement
- XTTS-v2 fine-tuning optimized for RTX 5090
- Automatic model deployment to your inference service
- Cleanup of old model versions

## 📁 Current Voice Data Status

Your voice recordings are located at:
```
/home/luke/personal-ai-clone/web/public/voices/lukemoeller_yahoo_com/
```

Current files:
- `voice_1753621218385.webm`
- `voice_1753629865528.webm`
- `voice_1753631313536.webm`
- `voice_1753639770547.webm`
- `voice_1753648292376.webm`
- `voice_1753649509620.webm`
- `voice_1753649509620_converted.wav` (already converted)

## 🛠️ Advanced Usage

### Custom Training Parameters

```bash
./start_rtx5090_voice_training.sh train \
  --user_id lukemoeller_yahoo_com \
  --epochs 150 \
  --batch_size 8 \
  --learning_rate 5e-6
```

### Preprocessing Only

```bash
./start_rtx5090_voice_training.sh preprocess --user_id lukemoeller_yahoo_com
```

### Manual Deployment

```bash
./start_rtx5090_voice_training.sh deploy --user_id lukemoeller_yahoo_com
```

### Check Training Status

```bash
./start_rtx5090_voice_training.sh status --user_id lukemoeller_yahoo_com
```

## 🔧 Technical Architecture

### Components

1. **RTX 5090 Voice Trainer** (`rtx5090_voice_trainer.py`)
   - Core training logic optimized for your GPU
   - Mixed precision training for memory efficiency
   - GPU memory optimization for 24GB VRAM

2. **Voice Data Preprocessor** (`voice_data_preprocessor.py`)
   - WebM to WAV conversion
   - Audio quality enhancement
   - Noise reduction and normalization

3. **XTTS Fine-tuner** (`xtts_fine_tuner.py`)
   - Proper XTTS-v2 fine-tuning implementation
   - Speaker conditioning and adaptation
   - Training loss computation and optimization

4. **Training Pipeline** (`voice_training_pipeline.py`)
   - Docker container orchestration
   - Training environment management
   - Integration with existing infrastructure

5. **Model Deployment System** (`model_deployment_system.py`)
   - Automatic model deployment
   - Version management
   - Integration with inference service

6. **Automated Pipeline** (`automated_training_pipeline.py`)
   - End-to-end workflow orchestration
   - Progress monitoring and logging
   - Error handling and recovery

### Docker Configuration

The solution uses a custom Dockerfile (`Dockerfile.voice_training`) based on:
```dockerfile
FROM nvcr.io/nvidia/pytorch:25.04-py3
```

This ensures:
- RTX 5090 sm_120 architecture support
- PyTorch 2.7.0a0 with CUDA 12.8+ compatibility
- Pre-configured NVIDIA optimizations

## 🎛️ Configuration Options

### Training Configuration

```python
@dataclass
class XTTSTrainingConfig:
    # Model settings
    model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    language: str = "en"
    
    # RTX 5090 optimized parameters
    batch_size: int = 6  # Optimized for 24GB VRAM
    num_epochs: int = 200
    learning_rate: float = 1e-5
    mixed_precision: bool = True
    
    # Audio settings
    sample_rate: int = 22050
    max_audio_len: int = 255995  # ~11.6 seconds
    min_audio_len: int = 44100   # 2 seconds
```

### Preprocessing Settings

```python
@dataclass
class PreprocessingConfig:
    target_sr: int = 22050
    min_duration: float = 2.0
    max_duration: float = 12.0
    enable_augmentation: bool = True
    apply_filters: bool = True
```

## 📊 Monitoring and Logging

### Progress Monitoring

The automated pipeline provides real-time monitoring:
- Training progress percentage
- Current epoch and loss values
- GPU utilization and memory usage
- Estimated time to completion
- Real-time log streaming

### Log Files

Training logs are saved to:
```
/home/luke/personal-ai-clone/ml/logs/training_progress_[user_id].json
```

### GPU Monitoring

Real-time GPU stats include:
- GPU utilization percentage
- VRAM usage (used/total)
- Temperature monitoring
- Power consumption

## 🔄 Integration with Existing System

### Voice Service Integration

The trained models automatically integrate with your existing voice service:

1. **Model Discovery**: New models are automatically discovered by the inference service
2. **Hot Swapping**: Models can be swapped without restarting the service
3. **Fallback**: Base XTTS-v2 model remains available as fallback

### API Endpoints

Your existing voice endpoints remain unchanged:
- `/voice/synthesize` - Uses the latest fine-tuned model if available
- `/voice/status` - Reports current model status
- `/voice/models/refresh` - Refreshes model discovery

## 🚨 Troubleshooting

### Common Issues

1. **CUDA Out of Memory**
   ```bash
   # Reduce batch size
   ./start_rtx5090_voice_training.sh train --user_id [user] --batch_size 4
   ```

2. **Container Build Issues**
   ```bash
   # Rebuild container
   docker rmi voice-training-rtx5090
   ./start_rtx5090_voice_training.sh setup
   ```

3. **Audio Format Issues**
   ```bash
   # Preprocess data first
   ./start_rtx5090_voice_training.sh preprocess --user_id [user]
   ```

### Checking System Status

```bash
# Check GPU status
nvidia-smi

# Check Docker
docker ps

# Check inference service
curl http://localhost:8000/health

# Check voice service
curl http://localhost:8000/voice/status
```

## 📈 Performance Optimization

### RTX 5090 Specific Optimizations

1. **Memory Management**
   - Gradient checkpointing enabled
   - Mixed precision training (FP16)
   - Optimized batch sizing for 24GB VRAM

2. **CUDA Optimizations**
   - TensorFloat-32 (TF32) enabled
   - cuDNN benchmarking enabled
   - Optimal memory allocation patterns

3. **Training Optimizations**
   - OneCycleLR scheduler
   - Gradient accumulation for effective larger batches
   - Early stopping and model checkpointing

### Expected Performance

With your RTX 5090 setup:
- **Training Speed**: ~2-3 minutes per epoch (depends on data size)
- **Memory Usage**: ~8-12GB VRAM during training
- **Total Training Time**: 6-10 hours for 200 epochs
- **Model Quality**: Significant improvement over base XTTS-v2

## 🔒 Security and Privacy

### Local Processing
- All training happens locally on your RTX 5090
- Voice data never leaves your system
- No cloud dependencies or external API calls

### Data Management
- Automatic cleanup of old model versions
- Secure model storage and versioning
- Encrypted model files (optional)

## 🚀 Future Enhancements

### Planned Features
1. **Multi-speaker Training**: Train on multiple voice samples
2. **Emotion Control**: Fine-tune for different emotional expressions
3. **Real-time Adaptation**: Continuous learning from chat interactions
4. **Voice Conversion**: Convert between different speaking styles
5. **Quality Metrics**: Automated voice quality assessment

### Experimental Features
1. **Distributed Training**: Multi-GPU support
2. **Quantization**: INT8 models for faster inference
3. **WebUI**: Browser-based training interface
4. **API Integration**: RESTful training API

## 📞 Support

### Getting Help

1. **Check Logs**: Always check the training logs first
2. **System Status**: Verify GPU and Docker status
3. **Voice Data**: Ensure voice recordings are high quality
4. **Container**: Verify NVIDIA container is working

### Common Commands

```bash
# Complete status check
./start_rtx5090_voice_training.sh status

# List all models
python3 model_deployment_system.py --action list

# Check voice data quality
python3 voice_data_preprocessor.py --action analyze --voice_dir /web/public/voices/[user_id]

# Manual container test
docker run --gpus all --rm nvcr.io/nvidia/pytorch:25.04-py3 nvidia-smi
```

## 🎉 Success Indicators

Your training is successful when you see:
1. ✅ Decreasing training loss over epochs
2. ✅ GPU utilization 80-95% during training
3. ✅ Model files generated in `/models/voices/[user_id]/`
4. ✅ Inference service successfully loads the new model
5. ✅ Voice synthesis uses the fine-tuned model

---

**Ready to train your voice model?** Start with:
```bash
cd /home/luke/personal-ai-clone/ml
./start_rtx5090_voice_training.sh train --user_id lukemoeller_yahoo_com
```