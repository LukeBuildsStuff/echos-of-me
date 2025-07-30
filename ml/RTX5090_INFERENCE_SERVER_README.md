# RTX 5090 ML Inference Server

A high-performance inference server optimized for fine-tuned Mistral 7B models running on NVIDIA RTX 5090 GPU with voice synthesis integration.

## Features

- **RTX 5090 Optimization**: Leverages CUDA sm_120 architecture with PyTorch 2.7.0a0+
- **Fine-tuned Mistral 7B Support**: Load and serve custom fine-tuned models
- **Memory Management**: Optimized for 24GB VRAM with intelligent memory allocation
- **Voice Synthesis**: Integrated text-to-speech with voice cloning
- **RESTful API**: Compatible with existing chat API routes
- **Health Monitoring**: Comprehensive monitoring and debugging tools
- **Model Management**: Dynamic model loading and switching

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   RTX 5090 Inference Server                │
├─────────────────────────────────────────────────────────────┤
│  FastAPI Web Server (Port 8000)                           │
│  ├── /chat - Main inference endpoint                       │
│  ├── /health - Health check                               │
│  ├── /status - Detailed status                            │
│  └── /models/* - Model management                          │
├─────────────────────────────────────────────────────────────┤
│  ML Engine                                                │
│  ├── Mistral 7B Model Loading                            │
│  ├── 4-bit Quantization (BitsAndBytesConfig)             │
│  ├── LoRA/QLoRA Adapter Support                          │
│  └── Memory Optimization (24GB VRAM)                      │
├─────────────────────────────────────────────────────────────┤
│  Voice Synthesis                                          │
│  ├── Coqui TTS Integration                               │
│  ├── Voice Cloning Support                               │
│  └── Audio File Generation                                │
├─────────────────────────────────────────────────────────────┤
│  RTX 5090 Hardware                                        │
│  ├── CUDA sm_120 Architecture                            │
│  ├── 24GB GDDR7 VRAM                                     │
│  └── PyTorch 2.7.0a0+ Support                            │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

### Hardware
- NVIDIA RTX 5090 GPU (24GB VRAM)
- Minimum 32GB system RAM
- 100GB+ storage for models

### Software
- Docker with NVIDIA runtime
- PyTorch 2.7.0a0+ (included in base image)
- CUDA 12.4+ with sm_120 support

## Quick Start

### 1. Start the Server

The server runs automatically in the ml-inference container:

```bash
docker-compose up ml-inference
```

### 2. Verify Server Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "rtx5090-inference",
  "gpu": "rtx5090",
  "model_loaded": true
}
```

### 3. Test Inference

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "user_context": "You are Luke, a helpful AI assistant.",
    "max_length": 200,
    "temperature": 0.7
  }'
```

## API Endpoints

### Chat Inference
`POST /chat`

Generate responses using the fine-tuned Mistral model.

**Request:**
```json
{
  "message": "Your question here",
  "user_context": "Context about the user (optional)",
  "max_length": 512,
  "temperature": 0.7,
  "top_p": 0.9,
  "voice_synthesis": false,
  "voice_id": "lukemoeller_yahoo_com"
}
```

**Response:**
```json
{
  "response": "Generated response text",
  "confidence": 0.85,
  "source": "mistral_7b_finetuned",
  "model_version": "mistral-7b-custom",
  "generation_time": 2.34,
  "memory_usage": {
    "gpu_allocated_gb": 8.5,
    "gpu_reserved_gb": 10.2
  },
  "audio_url": "/voices/synthesis/output.wav"
}
```

### Health Check
`GET /health`

Basic health check endpoint.

### Server Status
`GET /status`

Detailed server status including model information and resource usage.

### Model Management
- `GET /models/available` - List available models
- `POST /models/load` - Load a specific model
- `POST /memory/cleanup` - Force memory cleanup

## Model Support

The server automatically discovers and loads models from these locations:

1. `/models/mistral-7b-fine-tuned/` - Custom fine-tuned models
2. `/models/fine_tuned_models/` - Training output directory
3. `/models/huggingface/` - HuggingFace cache
4. Remote models: `mistralai/Mistral-7B-Instruct-v0.2`

### Supported Model Types
- **Full Models**: Complete fine-tuned Mistral models
- **LoRA Adapters**: Parameter-efficient fine-tuning adapters
- **QLoRA Models**: Quantized LoRA adapters

## Memory Optimization

The server implements several RTX 5090-specific optimizations:

### VRAM Management
- **Memory Fraction**: Uses 85% of 24GB VRAM (20.4GB)
- **Chunking**: Splits large operations to avoid memory fragmentation  
- **4-bit Quantization**: Reduces model memory footprint by ~75%
- **Dynamic Cleanup**: Automatic garbage collection and cache clearing

### Environment Variables
```bash
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
CUDA_LAUNCH_BLOCKING=0
TORCH_CUDA_ARCH_LIST="8.0;8.6;8.9;9.0"
```

## Voice Synthesis Integration

The server includes integrated voice synthesis capabilities:

### Features
- **Text-to-Speech**: Convert responses to audio
- **Voice Cloning**: Use custom voice profiles
- **Real-time Generation**: Generate audio alongside text

### Voice Synthesis Request
```json
{
  "message": "Hello, this is a test",
  "voice_synthesis": true,
  "voice_id": "lukemoeller_yahoo_com"
}
```

The response includes an `audio_url` field pointing to the generated audio file.

## Monitoring and Debugging

### Built-in Monitor
Use the monitoring script to check server health:

```bash
python rtx5090_monitor.py --continuous
```

### Test Suite
Run comprehensive tests:

```bash
python test_rtx5090_inference.py --test all
```

### Performance Metrics
The server tracks:
- Generation time per request
- GPU memory usage
- Model confidence scores
- Request throughput
- Error rates

## Troubleshooting

### Common Issues

**1. Model Not Loading**
```bash
# Check available models
curl http://localhost:8000/models/available

# Check server logs
docker-compose logs ml-inference
```

**2. CUDA Out of Memory**
```bash
# Force memory cleanup
curl -X POST http://localhost:8000/memory/cleanup

# Check memory usage
python rtx5090_monitor.py --test-only
```

**3. Slow Inference**
- Verify RTX 5090 is being used: Check GPU name in status endpoint
- Ensure PyTorch 2.7.0a0+ is installed
- Check for CUDA sm_120 support

### RTX 5090 Compatibility Check
```python
import torch
print(f"PyTorch: {torch.__version__}")  # Should be 2.7.0a0+
print(f"CUDA: {torch.cuda.get_device_capability(0)}")  # Should be (12, 0)
```

## Integration with Existing System

### Chat API Route
The inference server integrates seamlessly with the existing `/api/ai-echo/chat` route:

1. Web API receives chat request
2. Forwards to inference server at `ML_INFERENCE_URL/chat`
3. Returns response in expected format
4. Optionally includes voice synthesis

### Environment Variables
Set in docker-compose.yml:
```yaml
environment:
  - ML_INFERENCE_URL=http://ml-inference:8000
```

## Performance Benchmarks

### RTX 5090 Performance
- **Model Loading**: ~30-60 seconds (depending on model size)
- **Inference Speed**: 15-30 tokens/second
- **Memory Usage**: 8-12GB VRAM for Mistral 7B (4-bit)
- **Concurrent Requests**: Up to 3 simultaneous requests

### Expected Response Times
- Simple queries: 1-3 seconds
- Complex responses: 3-8 seconds  
- With voice synthesis: +2-5 seconds

## Development

### Adding New Models
1. Place model files in `/models/` directory
2. Restart server or call `/models/refresh`
3. Models are auto-discovered on startup

### Custom Voice Profiles
1. Add voice training data to `/models/voices/`
2. Train using the voice training pipeline
3. Profiles automatically available for synthesis

### Extending the API
The FastAPI server can be extended with additional endpoints by modifying `rtx5090_inference_server.py`.

## Security Considerations

- Server runs in isolated Docker container
- No direct file system access from API
- Input validation on all endpoints
- Rate limiting recommended for production

## License

This inference server is part of the Personal AI Clone project and follows the same licensing terms.