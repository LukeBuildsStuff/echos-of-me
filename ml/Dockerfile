FROM pytorch/pytorch:2.1.2-cuda12.1-cudnn8-devel

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    vim \
    wget \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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

# Install optimized PyTorch for CUDA 12.1
RUN pip install --no-cache-dir --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu121

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