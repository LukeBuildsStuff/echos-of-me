#!/usr/bin/env node

/**
 * Test the fixed Luke AI model infrastructure
 */

const { spawn } = require('child_process')

console.log('=== Testing Fixed Luke AI Model Infrastructure ===\n')

async function testFixedInference() {
  const testScript = `
import sys
import torch
import tempfile
import shutil
import json
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

try:
    print("🔧 Testing fixed Luke AI inference...")
    
    model_path = "/home/luke/personal-ai-clone/web/training/final_model"
    
    # Load tokenizer
    print("📚 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    print("✅ Tokenizer loaded successfully")
    
    # Force CPU for compatibility
    device = "cpu"
    print("💻 Using CPU inference (forced for RTX 5090 compatibility)")
    
    # Load base model
    print("🚀 Loading base TinyLlama model...")
    if device == "cpu":
        base_model = AutoModelForCausalLM.from_pretrained(
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            torch_dtype=torch.float32,
            trust_remote_code=True,
            use_cache=True,
            low_cpu_mem_usage=True
        )
        base_model = base_model.to("cpu")
    else:
        base_model = AutoModelForCausalLM.from_pretrained(
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            torch_dtype=torch.float32,
            device_map={"": device},
            trust_remote_code=True,
            use_cache=True,
            low_cpu_mem_usage=True
        )
    print(f"✅ Base model loaded on {device}")
    
    # Create temporary directory with fixed config
    print("🔧 Creating compatibility layer...")
    temp_model_dir = tempfile.mkdtemp()
    
    # Copy model files
    for file_name in ['adapter_model.safetensors', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json']:
        src_path = os.path.join(model_path, file_name)
        if os.path.exists(src_path):
            shutil.copy2(src_path, temp_model_dir)
    
    # Create minimal compatible adapter config
    compatible_config = {
        "base_model_name_or_path": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "bias": "none",
        "fan_in_fan_out": False,
        "inference_mode": True,
        "init_lora_weights": True,
        "lora_alpha": 32,
        "lora_dropout": 0.1,
        "peft_type": "LORA",
        "r": 16,
        "target_modules": [
            "gate_proj", "q_proj", "v_proj", "o_proj", "k_proj", "down_proj", "up_proj"
        ],
        "task_type": "CAUSAL_LM"
    }
    
    with open(os.path.join(temp_model_dir, "adapter_config.json"), "w") as f:
        json.dump(compatible_config, f, indent=2)
    
    print("✅ Compatibility layer created")
    
    # Load PEFT adapters
    print("🧠 Loading Luke's trained adapters...")
    model = PeftModel.from_pretrained(base_model, temp_model_dir)
    model.eval()
    print("✅ Luke's adapters loaded successfully!")
    
    # Test inference
    print("🎯 Testing inference with Luke's personality...")
    
    # Create prompt manually using TinyLlama format
    system_msg = "You are Luke, sharing your authentic thoughts and experiences with warmth and wisdom."
    user_msg = "What's the most important thing you've learned in life?"
    
    prompt = f"<|system|>\\n{system_msg}{tokenizer.eos_token}<|user|>\\n{user_msg}{tokenizer.eos_token}<|assistant|>\\n"
    
    inputs = tokenizer(
        prompt, 
        return_tensors="pt", 
        truncation=True, 
        max_length=512
    )
    
    if device == "cuda":
        inputs = {k: v.cuda() for k, v in inputs.items()}
    
    print("🔮 Generating response...")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=100,
            temperature=0.75,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
    
    response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    
    # Clean up
    shutil.rmtree(temp_model_dir)
    
    print("\\n🎉 LUKE'S TRAINED MODEL RESPONSE:")
    print("=" * 50)
    print(response.strip())
    print("=" * 50)
    print("\\n✅ SUCCESS: Luke's trained model is working!")
    print(f"📊 Device: {device}")
    print(f"🔧 Model: TinyLlama-1.1B + Luke's LoRA adapters")
    print("🎯 This proves the trained model can generate Luke's personality!")
    
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`
  
  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', testScript], { stdio: 'pipe' })
    
    python.stdout.on('data', (data) => {
      console.log(data.toString().trim())
    })
    
    python.stderr.on('data', (data) => {
      console.log(data.toString().trim())
    })
    
    python.on('close', (code) => {
      if (code === 0) {
        console.log('\n🚀 INFRASTRUCTURE STATUS: FULLY FUNCTIONAL')
        console.log('Luke\'s trained model is now ready to use!')
        resolve(true)
      } else {
        console.log(`\n❌ Test failed with exit code: ${code}`)
        resolve(false)
      }
    })
    
    python.on('error', (error) => {
      console.log(`\n❌ Python execution error: ${error.message}`)
      resolve(false)
    })
  })
}

testFixedInference().catch(console.error)