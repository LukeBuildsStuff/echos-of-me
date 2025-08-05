#!/usr/bin/env python3
"""
Test script for the trained Luke AI model
Quick verification that the RTX 5090 trained model generates responses
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

def test_luke_model():
    """Test the trained Luke AI model"""
    print("🧪 Testing Trained Luke AI Model")
    print("="*50)
    
    try:
        # Load tokenizer first
        print("📝 Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("./final_model")
        
        # Load base model
        print("🤖 Loading base model...")
        base_model = AutoModelForCausalLM.from_pretrained(
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            torch_dtype=torch.float16,
            device_map="auto"
        )
        
        # Load LoRA adapter
        print("🔧 Loading LoRA adapter...")
        model = PeftModel.from_pretrained(base_model, "./final_model")
        
        print("✅ Model loaded successfully!")
        print(f"🎯 Device: {next(model.parameters()).device}")
        print(f"💾 Model dtype: {next(model.parameters()).dtype}")
        
        # Test questions
        test_questions = [
            "What's your philosophy on life?",
            "How do you handle difficult situations?",
            "What's most important to you?",
            "Tell me about a meaningful moment in your life.",
            "What advice would you give to others?"
        ]
        
        print("\n🗣️  Testing Luke AI Responses:")
        print("="*50)
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n❓ Question {i}: {question}")
            
            # Create prompt in training format
            prompt = f"<|system|>\nYou are Luke, answering personal reflection questions about your life experiences.</s>\n<|user|>\n{question}</s>\n<|assistant|>\n"
            
            # Tokenize
            inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
            inputs = {k: v.to(model.device) for k, v in inputs.items()}
            
            # Generate response
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=100,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.1
                )
            
            # Decode response
            full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract just the assistant's response
            if "<|assistant|>" in full_response:
                response = full_response.split("<|assistant|>")[-1].strip()
            else:
                response = full_response[len(prompt):].strip()
            
            print(f"💬 Luke's Response: {response}")
            
            # Memory check
            if torch.cuda.is_available():
                memory_used = torch.cuda.memory_allocated(0) / (1024**3)
                print(f"   📊 GPU Memory: {memory_used:.2f}GB")
        
        print("\n✅ Model testing completed successfully!")
        
        # Model statistics
        print(f"\n📊 Model Statistics:")
        print(f"   🔢 Total parameters: {sum(p.numel() for p in model.parameters()):,}")
        print(f"   🔧 Trainable parameters: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
        print(f"   💾 Model size: ~{sum(p.numel() * p.element_size() for p in model.parameters()) / (1024**2):.1f}MB")
        
    except Exception as e:
        print(f"❌ Error testing model: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_luke_model()