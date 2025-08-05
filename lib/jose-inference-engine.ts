import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class JoseInferenceEngine:
    """Jose Brooklyn Construction Worker Inference Engine"""
    
    def __init__(self, model_path: str = "/home/luke/personal-ai-clone/web/training/jose_simple_final"):
        self.model_path = model_path
        self.base_model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        self.character_prompt = """You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft."""
        
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def load_model(self):
        """Load the fine-tuned Jose model"""
        logger.info(f"🔧 Loading Jose model from {self.model_path}")
        
        try:
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
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                trust_remote_code=True
            )
            
            # Load PEFT adapter (Jose character fine-tuning)
            self.model = PeftModel.from_pretrained(
                base_model,
                self.model_path,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
            )
            
            self.model.eval()
            logger.info("✅ Jose model loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load Jose model: {str(e)}")
            raise
    
    def generate_jose_response(self, user_question: str, max_tokens: int = 200) -> str:
        """Generate response as Jose character"""
        if not self.model or not self.tokenizer:
            raise RuntimeError("Jose model not loaded. Call load_model() first.")
        
        # Create Jose-specific prompt
        prompt = f"""<|system|>
{self.character_prompt}</s>
<|user|>
{user_question}</s>
<|assistant|>
"""
        
        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt")
        if self.device == "cuda":
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        # Generate response
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
        
        # Decode response
        response = self.tokenizer.decode(
            outputs[0][inputs['input_ids'].shape[1]:], 
            skip_special_tokens=True
        )
        
        return response.strip()
    
    def get_character_info(self) -> Dict:
        """Get Jose character information"""
        return {
            "name": "Jose",
            "background": "Brooklyn construction worker with 20+ years experience",
            "personality": "Hardworking, family-oriented, straightforward, takes pride in craft",
            "speech_style": "Authentic Brooklyn dialect with construction terminology",
            "base_model": self.base_model_name,
            "training_examples": 150,
            "character_consistency_score": 83.8
        }

# Initialize Jose engine for the application
jose_engine = JoseInferenceEngine()

async def get_jose_response(question: str) -> Dict[str, str]:
    """API endpoint function for Jose responses"""
    try:
        if not jose_engine.model:
            jose_engine.load_model()
        
        response = jose_engine.generate_jose_response(question)
        
        return {
            "character": "Jose",
            "response": response,
            "status": "success"
        }
    
    except Exception as e:
        logger.error(f"Jose response error: {str(e)}")
        return {
            "character": "Jose",
            "response": "Sorry, I'm having trouble right now. Try again in a bit.",
            "status": "error",
            "error": str(e)
        }

def test_jose_engine():
    """Test Jose inference engine"""
    engine = JoseInferenceEngine()
    engine.load_model()
    
    test_questions = [
        "What's your job like?",
        "Tell me about Brooklyn.",
        "How long have you been in construction?"
    ]
    
    for question in test_questions:
        response = engine.generate_jose_response(question)
        print(f"Q: {question}")
        print(f"Jose: {response}")
        print("---")

if __name__ == "__main__":
    test_jose_engine()
