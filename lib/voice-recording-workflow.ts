/**
 * Voice Recording Workflow for RTX 5090 Voice Cloning
 * 
 * Defines optimal voice recording requirements, passage scripts, and quality
 * criteria for creating high-quality voice clones using XTTS-v2
 */

export interface VoiceRecordingRequirements {
  technical: {
    sampleRate: number // Hz
    bitDepth: number
    channels: number
    format: string
    minDuration: number // seconds per passage
    maxDuration: number // seconds per passage
    targetSNR: number // dB
    maxBackgroundNoise: number // dB
  }
  
  environmental: {
    recommendedRoom: string
    microphoneDistance: string // cm from mouth
    acousticTreatment: string[]
    timeOfDay: string[]
    avoidConditions: string[]
  }
  
  vocal: {
    speakingPace: string
    volumeLevel: string
    pronunciation: string
    emotionalRange: string[]
    breathingInstructions: string[]
  }
}

export interface VoicePassageScript {
  id: string
  title: string
  category: 'conversational' | 'emotional' | 'wisdom' | 'technical'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedDuration: number // seconds
  phoneticTargets: string[]
  emotionalTargets: string[]
  instructions: string
  warmupText: string
  mainScript: string
  cooldownText: string
  qualityCriteria: {
    clarity: string
    emotion: string
    pacing: string
    consistency: string
  }
}

export interface RecordingSession {
  sessionId: string
  userId: string
  startedAt: Date
  currentPassage: number
  totalPassages: number
  completedPassages: VoicePassageScript[]
  qualityChecks: {
    [passageId: string]: {
      snr: number
      clarity: number
      consistency: number
      passed: boolean
      feedback: string[]
    }
  }
  environmentalConditions: {
    microphoneType: string
    roomType: string
    noiseLevel: string
    timestamp: Date
  }
}

/**
 * Optimal recording requirements for RTX 5090 voice cloning
 */
export const VOICE_RECORDING_REQUIREMENTS: VoiceRecordingRequirements = {
  technical: {
    sampleRate: 22050, // Optimal for XTTS-v2 and RTX 5090 memory efficiency
    bitDepth: 16, // CD quality, sufficient for voice cloning
    channels: 1, // Mono for voice cloning
    format: 'wav', // Lossless for training quality
    minDuration: 30, // Minimum for phonetic coverage
    maxDuration: 60, // Maximum to maintain attention and consistency
    targetSNR: 25, // dB, high quality but achievable at home
    maxBackgroundNoise: -40 // dB, quiet home environment
  },
  
  environmental: {
    recommendedRoom: 'Small, carpeted room with soft furnishings',
    microphoneDistance: '15-20cm from mouth',
    acousticTreatment: [
      'Thick curtains or blankets on walls',
      'Carpet or rugs on floor',
      'Avoid hard surfaces and empty rooms',
      'Record in a corner to reduce echoes',
      'Use a closet with hanging clothes if possible'
    ],
    timeOfDay: [
      'When voice is warmed up (avoid early morning)',
      'When energy levels are good',
      'Avoid late evening when voice is tired',
      'Consistent time across sessions for voice consistency'
    ],
    avoidConditions: [
      'Air conditioning or heating noise',
      'Traffic noise from outside',
      'Household appliances running',
      'Other people or pets in the area',
      'Windy weather (can affect audio through walls)'
    ]
  },
  
  vocal: {
    speakingPace: 'Natural, conversational pace - not too fast or slow',
    volumeLevel: 'Comfortable speaking volume, as if talking to someone nearby',
    pronunciation: 'Clear articulation, but natural - avoid over-enunciation',
    emotionalRange: [
      'Genuine emotional expression',
      'Natural warmth and personality',
      'Authentic responses, not performative',
      'Consistent with personal speaking style'
    ],
    breathingInstructions: [
      'Take natural pauses for breathing',
      'Don\'t hold breath while speaking',
      'Breathe away from microphone during pauses',
      'Stay relaxed and comfortable'
    ]
  }
}

/**
 * Voice passage scripts designed for comprehensive voice cloning
 */
export const VOICE_PASSAGE_SCRIPTS: VoicePassageScript[] = [
  {
    id: 'conversational-warmth',
    title: 'Conversational Warmth & Connection',
    category: 'conversational',
    difficulty: 'easy',
    estimatedDuration: 45,
    phoneticTargets: [
      'Connected speech patterns',
      'Natural rhythm and flow',
      'Warm vowel sounds',
      'Casual contractions',
      'Sentence-final intonation'
    ],
    emotionalTargets: [
      'Warmth and caring',
      'Natural conversational tone',
      'Gentle enthusiasm',
      'Authentic connection'
    ],
    instructions: 'Speak as if you\'re having a warm conversation with someone you care about. Let your natural personality and warmth come through. This should feel like sharing thoughts with a close friend or family member.',
    warmupText: 'Hi there. It\'s so good to see you. How has your day been? I\'ve been thinking about you.',
    mainScript: `You know, I was just thinking about something important I want to share with you. Life has taught me that the moments we spend really connecting with each other are what matter most. When I look back on all my experiences, it's not the big achievements that stand out - it's the quiet conversations, the shared laughter, the times when someone really listened to me, or when I was able to be there for someone else.

I remember when I was younger, I thought success meant being busy all the time, checking things off lists, moving fast toward some distant goal. But I've learned that real fulfillment comes from being present with the people we love. It comes from taking time to really see each other, to ask how someone is doing and then actually listen to the answer.

There's something magical about genuine conversation, isn't there? When we put away the distractions and really focus on each other, that's when we create the memories that last. That's when we build the relationships that sustain us through everything life brings our way.`,
    cooldownText: 'I hope that resonates with you. These are the kinds of thoughts I love sharing, because they come from the heart.',
    qualityCriteria: {
      clarity: 'Words should be clear and easy to understand, with natural articulation',
      emotion: 'Genuine warmth and caring should come through in the voice',
      pacing: 'Natural conversational rhythm with appropriate pauses',
      consistency: 'Maintain the same warm, caring tone throughout'
    }
  },
  
  {
    id: 'emotional-expression',
    title: 'Emotional Range & Expression',
    category: 'emotional',
    difficulty: 'medium',
    estimatedDuration: 50,
    phoneticTargets: [
      'Emotional prosody variation',
      'Pitch range expression',
      'Stress and emphasis patterns',
      'Emotional voice quality changes',
      'Dynamic intonation'
    ],
    emotionalTargets: [
      'Joy and celebration',
      'Gentle sadness and empathy',
      'Pride and accomplishment',
      'Reflective contemplation',
      'Hope and encouragement'
    ],
    instructions: 'This passage contains different emotional moments. Let yourself authentically feel and express each emotion as you read. Don\'t perform or exaggerate - just let the natural emotional shifts in your voice come through as you connect with each part of the story.',
    warmupText: 'Let me share with you some moments that have shaped who I am, moments that still bring up strong feelings when I think about them.',
    mainScript: `There are times in life that stay with you forever, moments so vivid you can still feel them in your heart years later. I remember the day my first grandchild was born - the overwhelming joy, the sense of wonder at this tiny perfect person, the way my heart felt like it might burst with love and hope for their future. That feeling of pure, radiant happiness is something I carry with me always.

But life brings sorrow too, and I've learned that sadness is just love with nowhere to go. When we lost my father, I felt a grief that seemed endless. Yet in time, I discovered that the sadness transformed into something deeper - a profound gratitude for every moment we'd shared, every lesson he'd taught me, every laugh we'd had together. That pain became a bridge to understanding how precious our time with each other really is.

I've also known the quiet pride that comes from watching someone you love accomplish something they've worked hard for. The way your chest fills with warmth when you see their face light up with achievement. That pride isn't just in their success - it's in their courage to try, their persistence through challenges, their willingness to grow and learn.

And through it all, there's been hope. Even in the darkest moments, there's always been this steady flame of belief that tomorrow can be better, that love endures, that the human spirit is remarkably resilient. Hope is what keeps us moving forward, what helps us find meaning in struggle, what connects us to something larger than ourselves.`,
    cooldownText: 'These emotions, all of them, are part of what makes us beautifully, completely human.',
    qualityCriteria: {
      clarity: 'Maintain clear speech even during emotional expressions',
      emotion: 'Authentic emotional variety - joy, sadness, pride, hope should all be naturally present',
      pacing: 'Allow emotional moments to affect natural pacing and pauses',
      consistency: 'Emotional expressions should feel genuine, not performed'
    }
  },
  
  {
    id: 'wisdom-legacy',
    title: 'Wisdom & Legacy Sharing',
    category: 'wisdom',
    difficulty: 'medium',
    estimatedDuration: 55,
    phoneticTargets: [
      'Thoughtful pacing',
      'Authoritative but gentle tone',
      'Clear enunciation for important points',
      'Reflective speech patterns',
      'Wisdom-conveying prosody'
    ],
    emotionalTargets: [
      'Deep thoughtfulness',
      'Gentle authority',
      'Caring guidance',
      'Reflective wisdom',
      'Legacy consciousness'
    ],
    instructions: 'Speak with the weight of experience and the gentleness of someone who truly cares about passing on wisdom. This should feel like the most important advice you could give to someone you love deeply.',
    warmupText: 'If I could share the most important things I\'ve learned in my life, these would be the lessons I\'d want you to carry with you always.',
    mainScript: `If there's one thing I want you to remember from everything I share with you, it's this: your character is built in the small moments, not just the big ones. Every day, you have countless opportunities to choose kindness over indifference, courage over comfort, truth over convenience. These choices might seem small at the time, but they're what shape who you become.

I've learned that real strength isn't about never falling down - it's about how you get back up, and what you learn from the experience. Life will test you in ways you can't imagine yet, but inside you is everything you need to not just survive, but to thrive. Trust yourself, but also stay humble enough to keep learning and growing.

Relationships are the true wealth of life. Invest in them with the same care you'd give to anything precious. Listen more than you speak. Forgive quickly. Show up for people, especially when it's inconvenient. Love generously, even when it's risky. The love you give away always comes back to you, often in ways you never expected.

Don't be afraid to fail at something that matters to you. Regret weighs more than failure ever will. Take the chances that align with your values. Follow the path that calls to your heart, even if others don't understand it. Your unique perspective and gifts are needed in this world.

And remember that every ending is also a beginning. Every goodbye makes room for a new hello. Every closed door leads you toward the one that's meant to open. Life is constantly inviting you to begin again, to see with fresh eyes, to hope with renewed faith.

This wisdom isn't just mine - it belongs to everyone who came before me, everyone who loved me enough to share their truth. Now I'm sharing it with you, and someday, you'll pass it on to others. That's how love travels through time, how wisdom becomes eternal.`,
    cooldownText: 'These aren\'t just words to me - they\'re the essence of everything I\'ve learned about how to live a meaningful life.',
    qualityCriteria: {
      clarity: 'Each important point should be clearly articulated and emphasized',
      emotion: 'Deep caring and wisdom should permeate the delivery',
      pacing: 'Thoughtful, deliberate pacing that allows wisdom to sink in',
      consistency: 'Maintain authoritative yet loving tone throughout'
    }
  },
  
  {
    id: 'technical-clarity',
    title: 'Clear Articulation & Technical Speech',
    category: 'technical',
    difficulty: 'easy',
    estimatedDuration: 40,
    phoneticTargets: [
      'Crisp consonants',
      'Clear vowel distinction',
      'Precise articulation',
      'Structured delivery',
      'Technical vocabulary clarity'
    ],
    emotionalTargets: [
      'Helpful instruction',
      'Patient guidance',
      'Clear communication',
      'Encouraging teaching'
    ],
    instructions: 'Speak with clarity and precision, as if you\'re explaining something important that the listener needs to understand completely. Focus on clear articulation while maintaining a warm, helpful tone.',
    warmupText: 'Let me walk you through this step by step, making sure everything is clear and easy to follow.',
    mainScript: `When you're learning something new, whether it's a practical skill, a technology, or even a way of thinking, the key is to break it down into manageable steps. First, understand the overall goal - what are you trying to accomplish? Having that clear picture in your mind helps everything else make sense.

Next, gather the tools or information you need. Don't try to wing it or figure things out as you go. Take time to prepare properly. Read the instructions carefully. Watch someone else do it if possible. Ask questions before you begin, not after you've made mistakes.

As you start practicing, focus on accuracy first, then speed. It's much easier to speed up a process you already do correctly than it is to unlearn bad habits. Take your time. Pay attention to details. Notice what works and what doesn't.

Remember that making mistakes is part of learning, not a sign of failure. When something goes wrong, stop and figure out why. What can you do differently next time? Each mistake is information that makes you better.

Be patient with yourself. Mastery takes time, and everyone learns at their own pace. Celebrate small improvements. Keep practicing regularly, even if it's just for a few minutes each day. Consistency beats intensity when it comes to building skills.

And finally, once you've learned something well, teach it to someone else. Teaching deepens your own understanding and helps you identify areas where you can still improve. Plus, sharing knowledge is one of the most rewarding things you can do.`,
    cooldownText: 'Remember, every expert was once a beginner. The difference is that they never stopped learning and practicing.',
    qualityCriteria: {
      clarity: 'Every word should be crisp and clearly articulated, especially technical terms',
      emotion: 'Helpful, encouraging teaching tone without being condescending',
      pacing: 'Structured, methodical delivery that aids comprehension',
      consistency: 'Maintain clear, instructional tone throughout'
    }
  }
]

/**
 * Voice Recording Workflow Manager
 */
export class VoiceRecordingWorkflow {
  private requirements = VOICE_RECORDING_REQUIREMENTS
  private scripts = VOICE_PASSAGE_SCRIPTS
  
  /**
   * Get recommended recording setup instructions
   */
  getSetupInstructions(): {
    equipment: string[]
    environment: string[]
    preparation: string[]
    testing: string[]
  } {
    return {
      equipment: [
        'Use a good quality USB microphone or headset with microphone',
        'Built-in laptop microphones can work but external is preferred',
        'Ensure microphone is positioned 15-20cm from your mouth',
        'Use headphones to monitor recording quality (optional but helpful)',
        'Have water nearby to stay hydrated'
      ],
      environment: [
        'Choose a small, quiet room with soft furnishings',
        'Hang blankets or towels on walls to reduce echo if needed',
        'Close windows and doors to minimize outside noise',
        'Turn off air conditioning, fans, and other noise sources',
        'Record when household is quiet (kids napping, etc.)',
        'Face away from hard surfaces like windows or bare walls'
      ],
      preparation: [
        'Read through the passage several times before recording',
        'Warm up your voice by speaking normally for a few minutes',
        'Have water available and stay hydrated',
        'Sit up straight with good posture for clear breathing',
        'Take a few deep breaths and relax before starting',
        'Practice the warmup text to get comfortable'
      ],
      testing: [
        'Record a 10-second test first to check audio quality',
        'Listen back to ensure voice is clear and background is quiet',
        'Adjust microphone position if needed',
        'Check that recording levels are good (not too quiet or too loud)',
        'Make sure you can speak naturally without straining'
      ]
    }
  }

  /**
   * Get passage script by ID
   */
  getPassageScript(passageId: string): VoicePassageScript | null {
    return this.scripts.find(script => script.id === passageId) || null
  }

  /**
   * Get all passage scripts in recommended order
   */
  getAllPassageScripts(): VoicePassageScript[] {
    return [...this.scripts]
  }

  /**
   * Get recording session progress
   */
  getSessionProgress(completedPassages: string[]): {
    completed: number
    total: number
    remaining: VoicePassageScript[]
    nextPassage: VoicePassageScript | null
    estimatedTimeRemaining: number
  } {
    const remaining = this.scripts.filter(script => 
      !completedPassages.includes(script.id)
    )
    
    const estimatedTime = remaining.reduce((sum, script) => 
      sum + script.estimatedDuration, 0
    )

    return {
      completed: completedPassages.length,
      total: this.scripts.length,
      remaining,
      nextPassage: remaining[0] || null,
      estimatedTimeRemaining: estimatedTime
    }
  }

  /**
   * Validate recording quality requirements
   */
  validateRecordingQuality(audioData: {
    duration: number
    snr: number
    peakLevel: number
    rmsLevel: number
  }): {
    passed: boolean
    score: number
    feedback: string[]
    requirements: {
      duration: boolean
      signalQuality: boolean
      noiseLevel: boolean
    }
  } {
    const feedback: string[] = []
    const requirements = {
      duration: false,
      signalQuality: false,
      noiseLevel: false
    }

    // Check duration
    if (audioData.duration >= this.requirements.technical.minDuration) {
      requirements.duration = true
    } else {
      feedback.push(`Recording too short: ${audioData.duration}s (minimum: ${this.requirements.technical.minDuration}s)`)
    }

    if (audioData.duration > this.requirements.technical.maxDuration) {
      feedback.push(`Recording too long: ${audioData.duration}s (maximum: ${this.requirements.technical.maxDuration}s)`)
    }

    // Check signal quality
    if (audioData.snr >= this.requirements.technical.targetSNR) {
      requirements.signalQuality = true
    } else {
      feedback.push(`Signal quality too low: ${audioData.snr}dB SNR (target: ${this.requirements.technical.targetSNR}dB)`)
      feedback.push('Try recording in a quieter environment or closer to the microphone')
    }

    // Check noise level
    if (audioData.snr >= this.requirements.technical.targetSNR) {
      requirements.noiseLevel = true
    } else {
      feedback.push('Background noise too high')
      feedback.push('Try eliminating noise sources or using acoustic treatment')
    }

    // Check levels
    if (audioData.peakLevel > 0.95) {
      feedback.push('Audio level too high - may be clipping. Move further from microphone.')
    } else if (audioData.rmsLevel < 0.1) {
      feedback.push('Audio level too low. Move closer to microphone or speak louder.')
    }

    const passed = Object.values(requirements).every(req => req)
    const score = Object.values(requirements).filter(req => req).length / Object.keys(requirements).length

    if (passed) {
      feedback.push('Excellent! This recording meets all quality requirements.')
    }

    return {
      passed,
      score,
      feedback,
      requirements
    }
  }

  /**
   * Get personalized feedback for recording improvement
   */
  getImprovementSuggestions(qualityResults: any): string[] {
    const suggestions: string[] = []

    if (!qualityResults.requirements.duration) {
      suggestions.push('Take your time with the passage - speak naturally and don\'t rush')
      suggestions.push('Include natural pauses for breathing and emphasis')
    }

    if (!qualityResults.requirements.signalQuality) {
      suggestions.push('Try recording in a smaller, more enclosed space')
      suggestions.push('Move closer to your microphone (15-20cm is optimal)')
      suggestions.push('Check that your microphone is working properly')
    }

    if (!qualityResults.requirements.noiseLevel) {
      suggestions.push('Find a quieter location or time to record')
      suggestions.push('Turn off fans, air conditioning, and other noise sources')
      suggestions.push('Close windows and doors to block outside noise')
      suggestions.push('Try recording in a closet with hanging clothes for natural sound dampening')
    }

    if (qualityResults.score > 0.5) {
      suggestions.push('You\'re doing well! Small adjustments will give you great results.')
    }

    return suggestions
  }

  /**
   * Generate recording session summary
   */
  generateSessionSummary(session: RecordingSession): {
    overallQuality: number
    readinessForTraining: boolean
    summary: string
    recommendations: string[]
  } {
    const qualityScores = Object.values(session.qualityChecks)
      .filter(check => check.passed)
      .map(check => (check.snr + check.clarity + check.consistency) / 3)

    const overallQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0

    const passedChecks = Object.values(session.qualityChecks)
      .filter(check => check.passed).length

    const readinessForTraining = passedChecks >= 3 && overallQuality >= 70

    const summary = `Recording session completed with ${passedChecks}/${this.scripts.length} passages meeting quality requirements. Overall quality score: ${overallQuality.toFixed(1)}%.`

    const recommendations: string[] = []

    if (readinessForTraining) {
      recommendations.push('Excellent work! Your voice recordings are ready for RTX 5090 training.')
      recommendations.push('High-quality voice clone with XTTS-v2 and Flash Attention 2 optimization.')
      recommendations.push('Expected training time: 2-3 minutes on RTX 5090.')
    } else {
      if (passedChecks < 3) {
        recommendations.push(`Complete ${3 - passedChecks} more high-quality recordings for voice training.`)
      }
      if (overallQuality < 70) {
        recommendations.push('Focus on improving recording quality using the setup suggestions.')
      }
      recommendations.push('Each quality recording improves your final voice clone accuracy.')
    }

    return {
      overallQuality,
      readinessForTraining,
      summary,
      recommendations
    }
  }
}

// Export singleton instance
export const voiceRecordingWorkflow = new VoiceRecordingWorkflow()

/**
 * Voice cloning quality targets for RTX 5090 optimization
 */
export const RTX5090_VOICE_QUALITY_TARGETS = {
  // Minimum requirements for voice training
  minimum: {
    totalDuration: 120, // 2 minutes minimum
    passages: 3, // At least 3 different passages
    averageQuality: 60, // 60% quality score
    snr: 20 // 20dB signal-to-noise ratio
  },
  
  // Recommended targets for best results
  recommended: {
    totalDuration: 180, // 3 minutes recommended
    passages: 4, // All 4 passages for full coverage
    averageQuality: 80, // 80% quality score
    snr: 25 // 25dB signal-to-noise ratio
  },
  
  // Optimal targets for exceptional quality
  optimal: {
    totalDuration: 240, // 4 minutes for maximum training data
    passages: 4, // All passages with re-recordings if needed
    averageQuality: 90, // 90% quality score
    snr: 30 // 30dB signal-to-noise ratio
  }
}