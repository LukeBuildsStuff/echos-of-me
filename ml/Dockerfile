# Use NVIDIA's PyTorch container with CUDA 12.1 that supports RTX 5090 (sm_120)
FROM nvcr.io/nvidia/pytorch:25.04-py3

WORKDIR /workspace

# Install system dependencies including audio libraries
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    git \
    vim \
    wget \
    curl \
    build-essential \
    libsndfile1 \
    libsndfile1-dev \
    ffmpeg \
    portaudio19-dev \
    libasound2-dev \
    libportaudio2 \
    libportaudiocpp0 \
    espeak-ng \
    espeak-ng-data \
    libespeak-ng1 \
    && rm -rf /var/lib/apt/lists/*

# Install core Python dependencies first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install voice cloning dependencies separately to avoid conflicts
RUN pip install --no-cache-dir \
    TTS==0.22.0 \
    soundfile==0.12.1

# Install compatible librosa version that works with numpy 1.22.0
RUN pip install --no-cache-dir \
    librosa==0.9.2 \
    resampy==0.4.2

# Install ML libraries optimized for RTX 5090
RUN pip install --no-cache-dir \
    transformers==4.36.2 \
    datasets==2.16.1 \
    accelerate==0.25.0 \
    bitsandbytes==0.42.0 \
    peft==0.8.2 \
    trl==0.7.10 \
    flash-attn==2.5.0 \
    wandb \
    scipy \
    sentencepiece \
    protobuf \
    safetensors \
    evaluate \
    rouge-score \
    nltk \
    requests \
    fastapi \
    uvicorn

# PyTorch is already installed in the NVIDIA base image with RTX 5090 support
# Just ensure we have the latest compatible versions of other packages

# Set up environment for RTX 5090
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0
ENV PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
ENV TOKENIZERS_PARALLELISM=false
ENV WANDB_PROJECT=echos-of-me
ENV HF_HOME=/models/huggingface

# Create directories
RUN mkdir -p /models/checkpoints /models/huggingface /workspace/logs

# Copy training scripts
COPY . .

# Set up cron for weekly training
RUN apt-get update && apt-get install -y cron \
    && echo "0 3 * * 0 cd /workspace && python weekly_training.py >> /workspace/logs/training.log 2>&1" | crontab -

CMD ["/bin/bash"]