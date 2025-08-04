'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VoiceTrainingGuideProps {
  onStartTraining: () => void
  onClose: () => void
}

interface TrainingTip {
  id: string
  category: 'preparation' | 'recording' | 'quality' | 'troubleshooting'
  title: string
  description: string
  importance: 'essential' | 'recommended' | 'advanced'
  icon: string
}

const TRAINING_TIPS: TrainingTip[] = [
  // Preparation Tips
  {
    id: 'quiet-environment',
    category: 'preparation',
    title: 'Find Your Quiet Space',
    description: 'Choose a room with minimal echo and background noise. Soft furnishings like carpets and curtains help absorb sound reflections.',
    importance: 'essential',
    icon: '🏠'
  },
  {
    id: 'microphone-distance',
    category: 'preparation', 
    title: 'Position Yourself Correctly',
    description: 'Sit 6-12 inches from your microphone. Too close creates breathing sounds, too far reduces voice clarity.',
    importance: 'essential',
    icon: '🎤'
  },
  {
    id: 'emotional-preparation',
    category: 'preparation',
    title: 'Prepare Emotionally',
    description: 'Take a few deep breaths and think about the loved ones who will hear your voice. This emotional connection improves voice quality.',
    importance: 'recommended',
    icon: '💙'
  },
  
  // Recording Tips
  {
    id: 'natural-speaking',
    category: 'recording',
    title: 'Speak Naturally',
    description: 'Read as if you\'re sharing stories with family. Avoid theatrical performance - your authentic voice is what we want to capture.',
    importance: 'essential',
    icon: '🗣️'
  },
  {
    id: 'pace-variation',
    category: 'recording',
    title: 'Vary Your Pace',
    description: 'Include natural pauses, speed up for excitement, slow down for emphasis. This variation makes your voice clone more expressive.',
    importance: 'recommended',
    icon: '⏱️'
  },
  {
    id: 'emotional-range',
    category: 'recording',
    title: 'Show Emotional Range',
    description: 'Express joy when sharing happy memories, gentle sadness for poignant moments. Your emotional range will be captured in the clone.',
    importance: 'recommended',
    icon: '🎭'
  },
  {
    id: 'clear-pronunciation',
    category: 'recording',
    title: 'Speak Clearly',
    description: 'Pronounce words fully, especially consonants at the ends of words. Clear speech creates a higher quality voice clone.',
    importance: 'essential',
    icon: '🔤'
  },
  
  // Quality Tips
  {
    id: 'consistent-volume',
    category: 'quality',
    title: 'Maintain Consistent Volume',
    description: 'Keep your voice at a steady, comfortable volume throughout the recording. Avoid whispering or shouting.',
    importance: 'essential',
    icon: '📊'
  },
  {
    id: 'hydration',
    category: 'quality',
    title: 'Stay Hydrated',
    description: 'Drink warm water before recording to keep your voice smooth. Avoid dairy or cold drinks which can affect voice clarity.',
    importance: 'recommended',
    icon: '💧'
  },
  {
    id: 'multiple-sessions',
    category: 'quality',
    title: 'Record When Fresh',
    description: 'Your voice is clearest when you\'re well-rested. If you feel tired, take a break and continue later.',
    importance: 'recommended',
    icon: '✨'
  },
  
  // Troubleshooting Tips
  {
    id: 'background-noise',
    category: 'troubleshooting',
    title: 'Handling Background Noise',
    description: 'If you hear noise during playback, try recording in a different room or time of day when it\'s quieter.',
    importance: 'essential',
    icon: '🔇'
  },
  {
    id: 'voice-changes',
    category: 'troubleshooting',
    title: 'Voice Sounds Different',
    description: 'It\'s normal to feel your voice sounds different when recorded. Focus on speaking naturally - the technology will adapt.',
    importance: 'recommended',
    icon: '🎵'
  },
  {
    id: 'recording-errors',
    category: 'troubleshooting',
    title: 'Technical Issues',
    description: 'If recording fails, check your microphone permissions and internet connection. You can always re-record any passage.',
    importance: 'essential',
    icon: '🔧'
  }
]

const CATEGORY_INFO = {
  preparation: {
    title: 'Before You Begin',
    description: 'Setting up for the best possible recording',
    color: 'bg-hope-50 border-hope-200 text-hope-800'
  },
  recording: {
    title: 'During Recording',
    description: 'Techniques for capturing your authentic voice',
    color: 'bg-comfort-50 border-comfort-200 text-comfort-800'
  },
  quality: {
    title: 'Quality Enhancement',
    description: 'Tips for professional-quality results',
    color: 'bg-memory-50 border-memory-200 text-memory-800'
  },
  troubleshooting: {
    title: 'Common Issues',
    description: 'Solutions for typical challenges',
    color: 'bg-peace-50 border-peace-200 text-peace-800'
  }
}

export default function VoiceTrainingGuide({ onStartTraining, onClose }: VoiceTrainingGuideProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('preparation')
  const [checkedTips, setCheckedTips] = useState<Set<string>>(new Set())

  const toggleTip = (tipId: string) => {
    const newChecked = new Set(checkedTips)
    if (newChecked.has(tipId)) {
      newChecked.delete(tipId)
    } else {
      newChecked.add(tipId)
    }
    setCheckedTips(newChecked)
  }

  const categoryTips = TRAINING_TIPS.filter(tip => tip.category === selectedCategory)
  const essentialTipsCompleted = TRAINING_TIPS
    .filter(tip => tip.importance === 'essential')
    .filter(tip => checkedTips.has(tip.id)).length
  const totalEssentialTips = TRAINING_TIPS.filter(tip => tip.importance === 'essential').length

  const readyToStart = essentialTipsCompleted >= Math.ceil(totalEssentialTips * 0.7) // 70% of essential tips

  return (
    <div className="mobile-full-height bg-heaven-gradient py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6" style={{ paddingLeft: 'max(0.75rem, var(--safe-area-inset-left))', paddingRight: 'max(0.75rem, var(--safe-area-inset-right))' }}>
        
        {/* Header */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="inline-block p-2 sm:p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-3 sm:mb-4 animate-float">
              <span className="text-2xl sm:text-3xl">📚</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              Voice Training Guide
            </CardTitle>
            <p className="text-sm sm:text-base text-peace-600 font-supportive mt-2">
              Learn how to create the highest quality voice clone with these expert tips and techniques.
            </p>
            
            {/* Progress Indicator */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-supportive text-peace-700">
                  Essential Tips Completed
                </span>
                <span className="text-sm font-supportive text-hope-600">
                  {essentialTipsCompleted}/{totalEssentialTips}
                </span>
              </div>
              <div className="w-full bg-hope-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(essentialTipsCompleted / totalEssentialTips) * 100}%` }}
                ></div>
              </div>
              {readyToStart && (
                <p className="text-xs text-green-600 font-supportive mt-2">
                  ✅ You&apos;re ready to start recording!
                </p>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Category Navigation */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`p-3 rounded-embrace text-center transition-all duration-200 ${
                    selectedCategory === key 
                      ? info.color + ' shadow-md'
                      : 'bg-peace-50 border border-peace-200 text-peace-600 hover:bg-peace-100'
                  }`}
                >
                  <div className="text-sm font-gentle">{info.title}</div>
                  <div className="text-xs mt-1 opacity-80">{info.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips Display */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl font-gentle text-peace-800">
              {CATEGORY_INFO[selectedCategory as keyof typeof CATEGORY_INFO]?.title}
            </CardTitle>
            <p className="text-sm text-peace-600 font-supportive">
              {CATEGORY_INFO[selectedCategory as keyof typeof CATEGORY_INFO]?.description}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-4">
              {categoryTips.map((tip) => (
                <div 
                  key={tip.id}
                  className={`p-4 rounded-embrace border-2 transition-all duration-200 ${
                    checkedTips.has(tip.id)
                      ? 'bg-green-50 border-green-200 shadow-sm'
                      : 'bg-white border-peace-200 hover:border-hope-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTip(tip.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-1 ${
                        checkedTips.has(tip.id)
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-peace-300 hover:border-hope-400'
                      }`}
                    >
                      {checkedTips.has(tip.id) && <span className="text-xs">✓</span>}
                    </button>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg" aria-hidden="true">{tip.icon}</span>
                        <h4 className="font-gentle text-peace-800">{tip.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            tip.importance === 'essential' 
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : tip.importance === 'recommended'
                                ? 'bg-hope-50 border-hope-200 text-hope-700'
                                : 'bg-peace-50 border-peace-200 text-peace-700'
                          }`}
                        >
                          {tip.importance}
                        </Badge>
                      </div>
                      <p className="text-sm text-peace-600 font-supportive leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Checklist */}
        <Card className="mobile-card bg-gradient-to-r from-hope-50 to-comfort-50 border-0 shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-gentle text-hope-800 mb-3 text-center">Quick Pre-Recording Checklist</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                '🏠 Quiet room selected',
                '🎤 Microphone positioned correctly',
                '💧 Had a drink of water',
                '📱 Phone on silent mode',
                '🌟 Feeling emotionally prepared',
                '📋 Read through the passages'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white/60 rounded-comfort">
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
          <Button
            onClick={onStartTraining}
            disabled={!readyToStart}
            className={`flex-1 min-h-[48px] rounded-embrace px-6 py-3 text-sm sm:text-base font-supportive ${
              readyToStart
                ? 'bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white'
                : 'bg-peace-200 text-peace-500 cursor-not-allowed'
            }`}
          >
            {readyToStart ? (
              <>
                <span className="mr-2">🎤</span>
                Start Voice Recording
              </>
            ) : (
              <>Complete Essential Tips First ({essentialTipsCompleted}/{totalEssentialTips})</>
            )}
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:w-auto min-h-[48px] border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6 text-sm sm:text-base"
          >
            Maybe Later
          </Button>
        </div>

        {/* Additional Resources */}
        <Card className="mobile-card bg-white/70 backdrop-blur-md border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <h4 className="font-gentle text-peace-800 mb-3">Why Voice Quality Matters</h4>
            <div className="space-y-2 text-sm text-peace-600 font-supportive">
              <p>
                • <strong>Emotional Connection:</strong> High-quality voice clones preserve the subtle emotional nuances that make your voice uniquely yours.
              </p>
              <p>
                • <strong>Natural Conversations:</strong> Better recordings result in more natural-sounding AI responses that truly reflect how you speak.
              </p>
              <p>
                • <strong>Legacy Preservation:</strong> Your voice clone will be a lasting gift to your loved ones - quality matters for generations.
              </p>
              <p>
                • <strong>Technological Accuracy:</strong> Clear recordings help the AI understand your speech patterns, accent, and pronunciation perfectly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}