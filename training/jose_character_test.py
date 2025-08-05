#!/usr/bin/env python3
"""
Jose Character Validation Test
Tests the Jose character responses without requiring model training
"""

import json
import logging
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_jose_training_data():
    """Load Jose training data"""
    jose_file = '/home/luke/personal-ai-clone/web/jose_formatted_training.json'
    with open(jose_file, 'r') as f:
        jose_data = json.load(f)
    return jose_data

def validate_jose_character():
    """Validate Jose character responses"""
    logger.info("🎭 Jose Character Validation Test")
    logger.info("=" * 50)
    
    # Load Jose data
    jose_data = load_jose_training_data()
    logger.info(f"📊 Loaded {len(jose_data)} Jose character examples")
    
    # Character validation criteria
    brooklyn_indicators = [
        "brooklyn", "bay ridge", "bensonhurst", "williamsburg", "dumbo", "red hook",
        "park slope", "coney island", "prospect park", "ya know", "buddy", "pal",
        "ain't", "gotta", "gonna", "doin'", "workin'", "buildin'"
    ]
    
    construction_terms = [
        "construction", "concrete", "framing", "electrical", "job site", "building",
        "tools", "hammer", "level", "safety", "hard hat", "steel-toe", "crew",
        "foreman", "contractor", "blueprint", "foundation", "rebar"
    ]
    
    personality_traits = [
        "honest work", "take pride", "twenty years", "family", "neighborhood",
        "respect", "safety first", "work hard", "look out for each other"
    ]
    
    # Validate responses
    valid_responses = 0
    brooklyn_count = 0
    construction_count = 0
    personality_count = 0
    
    logger.info("\n🔍 Analyzing Jose responses...")
    
    for i, item in enumerate(jose_data):
        response = item['output'].lower()
        
        # Check for Brooklyn dialect/references
        has_brooklyn = any(term in response for term in brooklyn_indicators)
        if has_brooklyn:
            brooklyn_count += 1
        
        # Check for construction terminology
        has_construction = any(term in response for term in construction_terms)
        if has_construction:
            construction_count += 1
        
        # Check for personality traits
        has_personality = any(trait in response for trait in personality_traits)
        if has_personality:
            personality_count += 1
        
        # Overall validation
        if has_brooklyn or has_construction or has_personality:
            valid_responses += 1
    
    # Results
    logger.info(f"\n📊 Validation Results:")
    logger.info(f"Total responses: {len(jose_data)}")
    logger.info(f"Valid character responses: {valid_responses} ({valid_responses/len(jose_data)*100:.1f}%)")
    logger.info(f"Brooklyn dialect/references: {brooklyn_count} ({brooklyn_count/len(jose_data)*100:.1f}%)")
    logger.info(f"Construction terminology: {construction_count} ({construction_count/len(jose_data)*100:.1f}%)")
    logger.info(f"Character personality traits: {personality_count} ({personality_count/len(jose_data)*100:.1f}%)")
    
    # Show sample authentic responses
    logger.info("\n🎭 Sample Authentic Jose Responses:")
    logger.info("-" * 50)
    
    sample_responses = random.sample(jose_data, min(5, len(jose_data)))
    for i, item in enumerate(sample_responses, 1):
        logger.info(f"\nExample {i}:")
        logger.info(f"Q: {item['input']}")
        logger.info(f"Jose: {item['output']}")
    
    # Character consistency check
    logger.info(f"\n✅ Character Consistency Analysis:")
    
    if valid_responses >= len(jose_data) * 0.8:
        logger.info("🟢 EXCELLENT: Jose character is highly consistent (80%+ authentic responses)")
        character_grade = "A"
    elif valid_responses >= len(jose_data) * 0.6:
        logger.info("🟡 GOOD: Jose character is moderately consistent (60%+ authentic responses)")
        character_grade = "B"
    else:
        logger.info("🔴 NEEDS IMPROVEMENT: Jose character needs more authentic responses")
        character_grade = "C"
    
    # Brooklyn dialect analysis
    if brooklyn_count >= len(jose_data) * 0.4:
        logger.info("🟢 Brooklyn dialect is well represented")
    else:
        logger.info("🟡 Brooklyn dialect could be stronger")
    
    # Construction expertise analysis
    if construction_count >= len(jose_data) * 0.6:
        logger.info("🟢 Construction expertise is well demonstrated")
    else:
        logger.info("🟡 Construction terminology could be more prevalent")
    
    # Create validation report
    report = {
        "character": "Jose",
        "validation_date": "2025-08-05",
        "total_responses": len(jose_data),
        "valid_responses": valid_responses,
        "character_grade": character_grade,
        "brooklyn_dialect_score": brooklyn_count / len(jose_data),
        "construction_expertise_score": construction_count / len(jose_data),
        "personality_consistency_score": personality_count / len(jose_data),
        "overall_authenticity": valid_responses / len(jose_data),
        "ready_for_deployment": valid_responses >= len(jose_data) * 0.7
    }
    
    # Save report
    report_file = "/home/luke/personal-ai-clone/web/training/jose_validation_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"\n📋 Validation report saved to: {report_file}")
    
    if report["ready_for_deployment"]:
        logger.info("🎉 Jose character is READY FOR DEPLOYMENT!")
    else:
        logger.info("⚠️ Jose character needs more work before deployment")
    
    return report

if __name__ == "__main__":
    report = validate_jose_character()