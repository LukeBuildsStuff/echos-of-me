'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Pause, Volume2, VolumeX, Moon, Sun, Shield, Info } from 'lucide-react'

interface EmotionalContext {
  sensitivityLevel: 'gentle' | 'standard' | 'direct'
  pauseMode: boolean
  quietMode: boolean
  safeSpaceActive: boolean
  currentEmotionalState: 'peaceful' | 'contemplative' | 'overwhelmed' | 'celebrating'
}

interface EmotionalSensitivityContextType {
  context: EmotionalContext
  updateContext: (updates: Partial<EmotionalContext>) => void
  showEmotionalCheck: () => void
  hideEmotionalCheck: () => void
}

const EmotionalSensitivityContext = createContext<EmotionalSensitivityContextType | null>(null)

export const useEmotionalSensitivity = () => {
  const context = useContext(EmotionalSensitivityContext)
  if (!context) {
    throw new Error('useEmotionalSensitivity must be used within EmotionalSensitivityProvider')
  }
  return context
}

interface EmotionalSensitivityProviderProps {
  children: React.ReactNode
}

export function EmotionalSensitivityProvider({ children }: EmotionalSensitivityProviderProps) {
  const [context, setContext] = useState<EmotionalContext>({
    sensitivityLevel: 'gentle',
    pauseMode: false,
    quietMode: false,
    safeSpaceActive: true,
    currentEmotionalState: 'peaceful'
  })

  const [showCheck, setShowCheck] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)

  const updateContext = (updates: Partial<EmotionalContext>) => {
    setContext(prev => ({ ...prev, ...updates }))
  }

  const showEmotionalCheck = () => setShowCheck(true)
  const hideEmotionalCheck = () => setShowCheck(false)

  // Periodic emotional wellness check
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date()
      if (!lastCheckTime || now.getTime() - lastCheckTime.getTime() > 30 * 60 * 1000) { // 30 minutes
        setShowCheck(true)
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(checkInterval)
  }, [lastCheckTime])

  const handleEmotionalStateUpdate = (state: EmotionalContext['currentEmotionalState']) => {
    updateContext({ currentEmotionalState: state })
    setLastCheckTime(new Date())
    setShowCheck(false)

    // Auto-adjust settings based on emotional state
    if (state === 'overwhelmed') {
      updateContext({
        sensitivityLevel: 'gentle',
        pauseMode: true,
        quietMode: true,
        safeSpaceActive: true
      })
    }
  }

  return (
    <EmotionalSensitivityContext.Provider 
      value={{ context, updateContext, showEmotionalCheck, hideEmotionalCheck }}
    >
      <div className={`min-h-screen transition-all duration-500 ${
        context.safeSpaceActive ? 'bg-heaven-gradient' : 'bg-gradient-to-br from-peace-50 to-peace-100'
      }`}>
        {/* Emotional Wellness Controls */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <div className="bg-white/90 backdrop-blur-md rounded-embrace p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-hope-600" />
              <span className="text-xs font-supportive text-peace-700">Emotional Wellness</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateContext({ pauseMode: !context.pauseMode })}
                className={`w-8 h-8 p-0 ${context.pauseMode ? 'bg-memory-100 text-memory-700' : ''}`}
                title="Take a mindful pause"
              >
                <Pause className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateContext({ quietMode: !context.quietMode })}
                className={`w-8 h-8 p-0 ${context.quietMode ? 'bg-peace-100 text-peace-700' : ''}`}
                title="Quiet mode - reduce sounds and animations"
              >
                {context.quietMode ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateContext({ safeSpaceActive: !context.safeSpaceActive })}
                className={`w-8 h-8 p-0 ${context.safeSpaceActive ? 'bg-hope-100 text-hope-700' : ''}`}
                title="Safe space mode - enhanced comfort settings"
              >
                <Shield className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={showEmotionalCheck}
                className="w-8 h-8 p-0"
                title="How are you feeling?"
              >
                <Info className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Pause Mode Overlay */}
        {context.pauseMode && (
          <div className="fixed inset-0 bg-peace-900/20 backdrop-blur-sm z-40 flex items-center justify-center">
            <Card className="bg-white/95 backdrop-blur-md border-0 shadow-2xl max-w-md mx-4">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-peace-100 rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-peace-600 animate-gentle-pulse" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-gentle text-peace-800">Taking a Mindful Moment</h3>
                  <p className="text-peace-700 font-supportive">
                    It's okay to pause and breathe. Grief comes in waves, and you're being so brave 
                    by preserving these precious memories.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-peace-600 mb-2">Take three deep breaths</div>
                    <div className="w-20 h-1 bg-hope-200 rounded-full mx-auto">
                      <div className="w-full h-full bg-hope-500 rounded-full animate-gentle-pulse"></div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => updateContext({ pauseMode: false })}
                    className="w-full bg-gradient-to-r from-peace-400 to-hope-400 hover:from-peace-500 hover:to-hope-500 text-white rounded-embrace font-supportive"
                  >
                    I'm Ready to Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Emotional Check-in Dialog */}
        {showCheck && (
          <div className="fixed inset-0 bg-peace-900/20 backdrop-blur-sm z-40 flex items-center justify-center">
            <Card className="bg-white/95 backdrop-blur-md border-0 shadow-2xl max-w-lg mx-4">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-hope-100 rounded-full flex items-center justify-center mx-auto">
                    <Heart className="w-8 h-8 text-hope-600" />
                  </div>
                  <h3 className="text-xl font-gentle text-peace-800">How Are You Feeling?</h3>
                  <p className="text-peace-700 font-supportive">
                    Working with memories can bring up different emotions. Let us know how you're doing 
                    so we can adjust the experience to support you better.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleEmotionalStateUpdate('peaceful')}
                    className="h-auto p-4 flex flex-col items-center gap-2 rounded-embrace border-hope-200 hover:bg-hope-50"
                  >
                    <div className="text-lg">🕊️</div>
                    <div className="font-supportive">Peaceful</div>
                    <div className="text-xs text-peace-600">Feeling calm and centered</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleEmotionalStateUpdate('contemplative')}
                    className="h-auto p-4 flex flex-col items-center gap-2 rounded-embrace border-comfort-200 hover:bg-comfort-50"
                  >
                    <div className="text-lg">💭</div>
                    <div className="font-supportive">Contemplative</div>
                    <div className="text-xs text-peace-600">Deep in thought and reflection</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleEmotionalStateUpdate('overwhelmed')}
                    className="h-auto p-4 flex flex-col items-center gap-2 rounded-embrace border-memory-200 hover:bg-memory-50"
                  >
                    <div className="text-lg">🌊</div>
                    <div className="font-supportive">Overwhelmed</div>
                    <div className="text-xs text-peace-600">Feeling a lot of emotions</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleEmotionalStateUpdate('celebrating')}
                    className="h-auto p-4 flex flex-col items-center gap-2 rounded-embrace border-green-200 hover:bg-green-50"
                  >
                    <div className="text-lg">✨</div>
                    <div className="font-supportive">Celebrating</div>
                    <div className="text-xs text-peace-600">Honoring beautiful memories</div>
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={hideEmotionalCheck}
                    className="text-peace-600 font-supportive"
                  >
                    Maybe later
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content with Emotional Context */}
        <div className={`${
          context.quietMode ? 'animate-none' : ''
        } ${
          context.currentEmotionalState === 'overwhelmed' ? 'p-8' : 'p-4'
        }`}>
          {children}
        </div>

        {/* Comforting Messages Based on Emotional State */}
        {context.currentEmotionalState === 'overwhelmed' && (
          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
            <Card className="bg-white/95 backdrop-blur-md border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Heart className="w-4 h-4 text-hope-600" />
                  <span className="text-sm font-supportive text-peace-700">Gentle Reminder</span>
                </div>
                <p className="text-xs text-peace-600">
                  You're doing something beautiful by preserving their memory. Take your time, and remember - 
                  their love continues through you. 💝
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </EmotionalSensitivityContext.Provider>
  )
}

// Grief-sensitive component wrapper
interface GriefSensitiveCardProps {
  children: React.ReactNode
  className?: string
  emotionalWeight?: 'light' | 'medium' | 'heavy'
}

export function GriefSensitiveCard({ children, className = '', emotionalWeight = 'medium' }: GriefSensitiveCardProps) {
  const { context } = useEmotionalSensitivity()
  
  const getCardStyling = () => {
    const baseStyles = 'bg-white/80 backdrop-blur-md border-0 shadow-xl transition-all duration-500'
    
    if (context.safeSpaceActive) {
      return `${baseStyles} hover:shadow-2xl hover:bg-white/90`
    }
    
    if (emotionalWeight === 'heavy' && context.currentEmotionalState === 'overwhelmed') {
      return `${baseStyles} bg-white/95 shadow-2xl border border-hope-200`
    }
    
    return baseStyles
  }
  
  return (
    <Card className={`${getCardStyling()} ${className}`}>
      {children}
    </Card>
  )
}

// Grief-sensitive button wrapper
interface GriefSensitiveButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  emotionalAction?: 'neutral' | 'positive' | 'intensive'
}

export function GriefSensitiveButton({ 
  children, 
  onClick, 
  variant = 'default', 
  className = '',
  emotionalAction = 'neutral'
}: GriefSensitiveButtonProps) {
  const { context } = useEmotionalSensitivity()
  
  const getButtonStyling = () => {
    if (context.currentEmotionalState === 'overwhelmed' && emotionalAction === 'intensive') {
      return 'bg-gradient-to-r from-peace-400 to-hope-400 hover:from-peace-500 hover:to-hope-500 text-white'
    }
    
    if (emotionalAction === 'positive') {
      return 'bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white'
    }
    
    return ''
  }
  
  return (
    <Button 
      variant={variant}
      onClick={onClick}
      className={`rounded-embrace font-supportive ${getButtonStyling()} ${className}`}
    >
      {children}
    </Button>
  )
}

// Grief-sensitive text component
interface GriefSensitiveTextProps {
  children: React.ReactNode
  level?: 'body' | 'emphasis' | 'gentle'
  className?: string
}

export function GriefSensitiveText({ children, level = 'body', className = '' }: GriefSensitiveTextProps) {
  const { context } = useEmotionalSensitivity()
  
  const getTextStyling = () => {
    const baseStyles = 'font-supportive transition-colors duration-300'
    
    if (context.currentEmotionalState === 'overwhelmed') {
      return `${baseStyles} text-peace-700 leading-relaxed`
    }
    
    if (level === 'gentle') {
      return `${baseStyles} text-peace-600`
    }
    
    if (level === 'emphasis') {
      return `${baseStyles} text-peace-800 font-gentle`
    }
    
    return `${baseStyles} text-peace-700`
  }
  
  return (
    <span className={`${getTextStyling()} ${className}`}>
      {children}
    </span>
  )
}

export default EmotionalSensitivityWrapper