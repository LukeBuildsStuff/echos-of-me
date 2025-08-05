#!/usr/bin/env python3
"""
Jose Character Model Validation Script
Author: Claude Code (LLM Fine-tuning Specialist)

Tests the fine-tuned Jose model to verify:
- Brooklyn construction worker personality
- Authentic NY speech patterns
- Construction industry knowledge
- Character consistency across different topics
"""

import os
import sys
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JoseModelTester:
    def __init__(self, model_path: str = "/home/luke/personal-ai-clone/web/training/jose_final_model"):
        self.model_path = model_path
        self.base_model_name = "meta-llama/Llama-3.1-8B-Instruct"
        self.system_prompt = "You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft."
        
        self.tokenizer = None
        self.model = None
        
    def load_model(self):
        """Load the fine-tuned Jose model"""
        logger.info(f"🔧 Loading Jose model from {self.model_path}")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.base_model_name,
            trust_remote_code=True
        )
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load base model
        base_model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True
        )
        
        # Load PEFT adapter
        self.model = PeftModel.from_pretrained(
            base_model,
            self.model_path,
            torch_dtype=torch.bfloat16
        )
        
        self.model.eval()
        logger.info("✅ Jose model loaded successfully")
        
    def generate_response(self, question: str, max_tokens: int = 200) -> str:
        """Generate response as Jose"""
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{self.system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>

{question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        response = self.tokenizer.decode(
            outputs[0][inputs['input_ids'].shape[1]:], 
            skip_special_tokens=True
        )
        
        return response.strip()
    
    def run_character_validation(self):
        """Run comprehensive Jose character validation"""
        logger.info("🎭 Starting Jose Character Validation")
        
        # Test categories for Jose
        test_categories = {
            "Construction Work": [
                "What's your job like?",
                "Tell me about working in construction.",
                "What's the hardest part of your work?",
                "How long have you been doing construction?",
                "What kind of projects do you work on?"
            ],
            "Brooklyn/NY Life": [
                "How long have you lived in Brooklyn?",
                "What's it like living in New York?",
                "Tell me about your neighborhood.",
                "How's the commute to work?",
                "What do you like about Brooklyn?"
            ],
            "Personal/Family": [
                "Tell me about your family.",
                "What do you do on weekends?",
                "How do you relax after work?",
                "What are you proud of?",
                "What's important to you?"
            ],
            "Work Philosophy": [
                "What makes a good construction worker?",
                "How do you handle difficult situations at work?",
                "What advice would you give to someone starting in construction?",
                "What's changed in construction over the years?",
                "What do you think about your work?"
            ]
        }
        
        all_responses = {}
        
        for category, questions in test_categories.items():
            logger.info(f"\n🔍 Testing category: {category}")
            logger.info("=" * 50)
            
            category_responses = []
            
            for question in questions:
                logger.info(f"\nQ: {question}")
                response = self.generate_response(question)
                logger.info(f"Jose: {response}")
                
                category_responses.append({
                    "question": question,
                    "response": response
                })
            
            all_responses[category] = category_responses
        
        # Save validation results
        validation_file = "/home/luke/personal-ai-clone/web/training/jose_validation_results.json"
        with open(validation_file, 'w') as f:
            json.dump(all_responses, f, indent=2)
        
        logger.info(f"\n💾 Validation results saved to: {validation_file}")
        
        return all_responses
    
    def analyze_character_traits(self, responses):
        """Analyze Jose's character traits in responses"""
        logger.info("\n🔍 Analyzing Jose Character Traits")
        logger.info("=" * 40)
        
        # Key traits to look for
        brooklyn_indicators = ['brooklyn', 'ny', 'new york', 'borough', 'neighborhood']
        construction_terms = ['construction', 'building', 'site', 'work', 'contractor', 'foreman', 'project']
        speech_patterns = ["ain't", "ya know", "gotta", "gonna", "workin'", "buildin'", "doin'"]
        
        trait_analysis = {
            "brooklyn_references": 0,
            "construction_terminology": 0,
            "authentic_speech": 0,
            "total_responses": 0
        }
        
        for category, category_responses in responses.items():
            for item in category_responses:
                response_text = item['response'].lower()
                trait_analysis["total_responses"] += 1
                
                # Check for Brooklyn references
                if any(term in response_text for term in brooklyn_indicators):
                    trait_analysis["brooklyn_references"] += 1
                
                # Check for construction terminology
                if any(term in response_text for term in construction_terms):
                    trait_analysis["construction_terminology"] += 1
                
                # Check for authentic speech patterns
                if any(pattern in response_text for pattern in speech_patterns):
                    trait_analysis["authentic_speech"] += 1
        
        # Calculate percentages
        total = trait_analysis["total_responses"]
        brooklyn_pct = (trait_analysis["brooklyn_references"] / total) * 100
        construction_pct = (trait_analysis["construction_terminology"] / total) * 100
        speech_pct = (trait_analysis["authentic_speech"] / total) * 100
        
        logger.info(f"📊 Character Trait Analysis:")
        logger.info(f"  Brooklyn References: {trait_analysis['brooklyn_references']}/{total} ({brooklyn_pct:.1f}%)")
        logger.info(f"  Construction Terms: {trait_analysis['construction_terminology']}/{total} ({construction_pct:.1f}%)")
        logger.info(f"  Authentic Speech: {trait_analysis['authentic_speech']}/{total} ({speech_pct:.1f}%)")
        
        # Overall character consistency score
        consistency_score = (brooklyn_pct + construction_pct + speech_pct) / 3
        logger.info(f"  Overall Character Consistency: {consistency_score:.1f}%")
        
        if consistency_score >= 70:
            logger.info("✅ EXCELLENT: Jose character is highly consistent")
        elif consistency_score >= 50:
            logger.info("⚠️ GOOD: Jose character is moderately consistent")
        else:
            logger.info("❌ POOR: Jose character needs improvement")
        
        return trait_analysis

def main():
    """Main validation entry point"""
    logger.info("🎭 Jose Character Model Validation")
    logger.info("==================================")
    
    # Check if model exists
    model_path = "/home/luke/personal-ai-clone/web/training/jose_final_model"
    if not os.path.exists(model_path):
        logger.error(f"❌ Jose model not found at {model_path}")
        logger.error("Please run the training script first: ./run_jose_training.sh")
        sys.exit(1)
    
    # Initialize tester
    tester = JoseModelTester(model_path)
    
    try:
        # Load model
        tester.load_model()
        
        # Run validation
        responses = tester.run_character_validation()
        
        # Analyze character traits
        tester.analyze_character_traits(responses)
        
        logger.info("\n🎉 Jose Character Validation Complete!")
        logger.info("Check jose_validation_results.json for detailed responses")
        
    except Exception as e:
        logger.error(f"❌ Validation failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()