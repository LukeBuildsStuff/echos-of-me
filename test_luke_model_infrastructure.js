#!/usr/bin/env node

/**
 * Test script to verify Luke's AI model infrastructure
 * 
 * This script tests:
 * 1. Python3 availability
 * 2. Required Python packages
 * 3. Model file accessibility
 * 4. Basic inference capability
 */

const { spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')

console.log('=== Luke AI Model Infrastructure Test ===\n')

async function testPythonAvailability() {
  console.log('1. Testing Python availability...')
  
  return new Promise((resolve) => {
    const python = spawn('python3', ['--version'], { stdio: 'pipe' })
    
    let output = ''
    python.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    python.stderr.on('data', (data) => {
      output += data.toString()
    })
    
    python.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Python3 available: ${output.trim()}`)
        resolve(true)
      } else {
        console.log(`✗ Python3 not available (exit code: ${code})`)
        resolve(false)
      }
    })
    
    python.on('error', (error) => {
      console.log(`✗ Python3 error: ${error.message}`)
      resolve(false)
    })
  })
}

async function testPythonPackages() {
  console.log('\n2. Testing required Python packages...')
  
  const requiredPackages = [
    'torch',
    'transformers',
    'peft',
    'bitsandbytes'
  ]
  
  const results = {}
  
  for (const pkg of requiredPackages) {
    const available = await testPackage(pkg)
    results[pkg] = available
    console.log(`   ${available ? '✓' : '✗'} ${pkg}`)
  }
  
  const allAvailable = Object.values(results).every(v => v)
  console.log(`\nPackages status: ${allAvailable ? 'All required packages available' : 'Some packages missing'}`)
  
  return results
}

async function testPackage(packageName) {
  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', `import ${packageName}; print("${packageName} available")`], { stdio: 'pipe' })
    
    python.on('close', (code) => {
      resolve(code === 0)
    })
    
    python.on('error', () => {
      resolve(false)
    })
  })
}

async function testModelFiles() {
  console.log('\n3. Testing model file accessibility...')
  
  const modelPath = '/home/luke/personal-ai-clone/web/training/final_model'
  const requiredFiles = [
    'adapter_config.json',
    'adapter_model.safetensors',
    'tokenizer.json',
    'tokenizer_config.json'
  ]
  
  const results = {}
  
  for (const file of requiredFiles) {
    const filePath = path.join(modelPath, file)
    try {
      await fs.access(filePath)
      results[file] = true
      console.log(`   ✓ ${file}`)
    } catch (error) {
      results[file] = false
      console.log(`   ✗ ${file} - ${error.message}`)
    }
  }
  
  const allPresent = Object.values(results).every(v => v)
  console.log(`\nModel files status: ${allPresent ? 'All required files present' : 'Some files missing'}`)
  
  return results
}

async function testBasicInference() {
  console.log('\n4. Testing basic model loading capability...')
  
  const testScript = `
import sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("/home/luke/personal-ai-clone/web/training/final_model")
    print("✓ Tokenizer loaded successfully")
    
    print("Setting up quantization config...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    print("✓ Quantization config ready")
    
    print("Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=True,
        use_cache=True
    )
    print("✓ Base model loaded successfully")
    
    print("Loading PEFT adapters...")
    model = PeftModel.from_pretrained(base_model, "/home/luke/personal-ai-clone/web/training/final_model")
    print("✓ PEFT adapters loaded successfully")
    
    print("✓ Model infrastructure test PASSED")
    print("✓ Luke's trained model is ready for inference")
    
except Exception as e:
    print(f"✗ Model loading failed: {e}")
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
        console.log('\n✓ Basic inference test PASSED - Luke\'s model can be loaded')
        resolve(true)
      } else {
        console.log(`\n✗ Basic inference test FAILED (exit code: ${code})`)
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

async function generateTestReport() {
  console.log('\n=== DIAGNOSIS REPORT ===\n')
  
  const pythonAvailable = await testPythonAvailability()
  const packageResults = await testPythonPackages()
  const fileResults = await testModelFiles()
  let inferenceWorks = false
  
  if (pythonAvailable && Object.values(packageResults).every(v => v) && Object.values(fileResults).every(v => v)) {
    inferenceWorks = await testBasicInference()
  } else {
    console.log('\n4. Skipping inference test due to missing dependencies or files')
  }
  
  console.log('\n=== SUMMARY ===')
  console.log(`Python3: ${pythonAvailable ? '✓' : '✗'}`)
  console.log(`Required packages: ${Object.values(packageResults).every(v => v) ? '✓' : '✗'}`)
  console.log(`Model files: ${Object.values(fileResults).every(v => v) ? '✓' : '✗'}`)
  console.log(`Model loading: ${inferenceWorks ? '✓' : '✗'}`)
  
  if (pythonAvailable && Object.values(packageResults).every(v => v) && Object.values(fileResults).every(v => v) && inferenceWorks) {
    console.log('\n🎉 INFRASTRUCTURE STATUS: FULLY FUNCTIONAL')
    console.log('Luke\'s trained model is ready and should be generating responses!')
    console.log('\nIf users are still getting generic responses, the issue might be:')
    console.log('- API routing problems')
    console.log('- Session management issues')
    console.log('- Fallback logic being triggered unnecessarily')
  } else {
    console.log('\n❌ INFRASTRUCTURE STATUS: NEEDS ATTENTION')
    console.log('This explains why users are getting generic responses instead of Luke\'s trained model.')
    
    if (!pythonAvailable) {
      console.log('\nFIX: Install Python3')
    }
    
    const missingPackages = Object.entries(packageResults).filter(([pkg, available]) => !available).map(([pkg]) => pkg)
    if (missingPackages.length > 0) {
      console.log(`\nFIX: Install missing Python packages: ${missingPackages.join(', ')}`)
      console.log('Run: pip3 install transformers peft bitsandbytes torch')
    }
    
    const missingFiles = Object.entries(fileResults).filter(([file, available]) => !available).map(([file]) => file)
    if (missingFiles.length > 0) {
      console.log(`\nFIX: Missing model files: ${missingFiles.join(', ')}`)
      console.log('Re-run the training process to generate these files')
    }
  }
  
  console.log('\n=== END REPORT ===')
}

// Run the test
generateTestReport().catch(console.error)