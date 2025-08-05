#!/usr/bin/env node

/**
 * Test CPU-only inference for Luke's model
 */

const { spawn } = require('child_process')

console.log('=== Testing CPU-only inference ===\n')

async function testCPUInference() {
  const testScript = `
import sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

try:
    print("Testing CPU-only inference...")
    
    # Force CPU usage
    device = "cpu"
    print(f"Using device: {device}")
    
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("/home/luke/personal-ai-clone/web/training/final_model")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    print("✓ Tokenizer loaded successfully")
    
    print("Loading base model on CPU...")
    base_model = AutoModelForCausalLM.from_pretrained(
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        torch_dtype=torch.float32,  # Use float32 for CPU
        device_map={"": device},
        trust_remote_code=True,
        use_cache=True,
        low_cpu_mem_usage=True
    )
    print("✓ Base model loaded successfully on CPU")
    
    print("Loading PEFT adapters...")
    model = PeftModel.from_pretrained(base_model, "/home/luke/personal-ai-clone/web/training/final_model")
    model.eval()
    print("✓ PEFT adapters loaded successfully")
    
    print("Testing inference...")
    messages = [
        {"role": "system", "content": "You are Luke, sharing your authentic thoughts and experiences with warmth and wisdom."},
        {"role": "user", "content": "Tell me about what's important in life."}
    ]
    
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    inputs = tokenizer(
        prompt, 
        return_tensors="pt", 
        truncation=True, 
        max_length=512
    )
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=50,
            temperature=0.7,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
    
    response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    print(f"✓ Generated response: {response}")
    
    print("✓ CPU inference test PASSED - Luke's model works on CPU!")
    
except Exception as e:
    print(f"✗ CPU inference failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`
  
  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', testScript], { stdio: 'pipe' })
    
    let stdout = ''
    let stderr = ''
    
    python.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output
      console.log(output.trim())
    })
    
    python.stderr.on('data', (data) => {
      const output = data.toString()
      stderr += output
      console.log(output.trim())
    })
    
    python.on('close', (code) => {
      if (code === 0) {
        console.log('\n✓ CPU inference works! Luke\'s model can generate responses.')
        resolve(true)
      } else {
        console.log(`\n✗ CPU inference failed (exit code: ${code})`)
        if (stderr) {
          console.log('Error details:', stderr)
        }
        resolve(false)
      }
    })
    
    python.on('error', (error) => {
      console.log(`\n✗ Python execution error: ${error.message}`)
      resolve(false)
    })
  })
}

testCPUInference().catch(console.error)