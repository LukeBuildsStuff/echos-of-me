FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-devel

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    vim \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install additional ML libraries
RUN pip install --no-cache-dir \
    transformers==4.36.0 \
    datasets==2.16.0 \
    accelerate==0.25.0 \
    bitsandbytes==0.41.3 \
    peft==0.7.1 \
    trl==0.7.6 \
    wandb \
    scipy \
    sentencepiece \
    protobuf \
    safetensors

# Set up environment
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0

# Copy training scripts
COPY . .

CMD ["/bin/bash"]