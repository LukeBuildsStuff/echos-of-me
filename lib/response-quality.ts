/**
 * Response Quality Scoring Utility
 * Shared between client and server for consistent scoring
 */

export interface QualityScore {
  score: number;
  emoji: string;
  message: string;
  tier: 'start' | 'good' | 'better' | 'best';
}

export function calculateResponseQuality(responseText: string): QualityScore {
  if (!responseText || responseText.trim().length < 10) {
    return {
      score: 0,
      emoji: '😐',
      message: 'Start sharing your story...',
      tier: 'start'
    };
  }

  let score = 0.2; // Base score for any response
  const text = responseText.toLowerCase();
  const words = responseText.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Length scoring (0-0.3)
  if (wordCount >= 100) score += 0.3;
  else if (wordCount >= 50) score += 0.25;
  else if (wordCount >= 30) score += 0.2;
  else if (wordCount >= 15) score += 0.15;
  else if (wordCount >= 10) score += 0.1;

  // Personal connection indicators (0-0.2)
  const personalWords = ['i', 'my', 'me', 'myself', 'our', 'we', 'us'];
  const personalCount = personalWords.filter(word => text.includes(` ${word} `) || text.startsWith(`${word} `)).length;
  score += Math.min(personalCount * 0.02, 0.2);

  // Emotional depth indicators (0-0.2)
  const emotionalWords = [
    'love', 'loved', 'loving', 'proud', 'happy', 'joy', 'grateful', 
    'sad', 'hurt', 'worried', 'excited', 'surprised', 'moved', 
    'touched', 'felt', 'feel', 'remember', 'remembered', 'miss',
    'cherish', 'treasure', 'meaningful', 'special', 'important'
  ];
  const emotionalMatches = emotionalWords.filter(word => text.includes(word)).length;
  score += Math.min(emotionalMatches * 0.03, 0.2);

  // Storytelling and detail indicators (0-0.2)
  const storyWords = [
    'when', 'where', 'how', 'why', 'story', 'time', 'moment', 
    'experience', 'happened', 'remember', 'learned', 'taught',
    'realized', 'discovered', 'thought', 'knew', 'understood',
    'advice', 'lesson', 'wisdom', 'always', 'never'
  ];
  const storyMatches = storyWords.filter(word => text.includes(word)).length;
  score += Math.min(storyMatches * 0.02, 0.2);

  // Specific details bonus (0-0.1)
  const hasQuotes = text.includes('"') || text.includes("'");
  const hasNumbers = /\d/.test(text);
  const hasCapitalizedWords = /[A-Z][a-z]+/.test(responseText); // Names, places
  if (hasQuotes) score += 0.03;
  if (hasNumbers) score += 0.02;
  if (hasCapitalizedWords && wordCount > 20) score += 0.05;

  // Cap score at 1.0
  score = Math.min(score, 1.0);

  // Determine tier and messaging
  if (score < 0.5) {
    return {
      score,
      emoji: '😊',
      message: wordCount < 20 ? 'Keep going...' : 'Good start!',
      tier: 'good'
    };
  } else if (score < 0.75) {
    return {
      score,
      emoji: '😃',
      message: 'Great detail! Your family will love this.',
      tier: 'better'
    };
  } else {
    return {
      score,
      emoji: '🥰',
      message: 'Beautiful story! This will be treasured forever.',
      tier: 'best'
    };
  }
}

export function getCompletionMessage(quality: QualityScore): string {
  switch (quality.tier) {
    case 'good':
      return 'Every word you share is a gift to your loved ones';
    case 'better':
      return 'Your stories bring so much warmth and connection';
    case 'best':
      return 'This beautiful memory will be treasured forever';
    default:
      return 'Thank you for sharing your heart';
  }
}