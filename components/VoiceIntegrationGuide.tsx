'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mic, MicOff, Play, Pause, Square, Upload, Volume2, Heart, Sparkles, CheckCircle2, AlertCircle, Info, FileAudio, Clock, Zap } from 'lucide-react'

interface VoiceRecording {
  id: string
  name: string
  duration: number
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  emotionalTone: string
  uploadDate: string
  processed: boolean
  audioUrl?: string
}

interface VoiceProfile {
  memberName: string
  totalRecordings: number
  totalDuration: number
  qualityScore: number
  emotionalRange: string[]
  trainingProgress: number
  voiceCharacteristics: {
    pitch: 'low' | 'medium' | 'high'
    pace: 'slow' | 'moderate' | 'fast'
    warmth: number
    clarity: number
  }
}

interface VoiceIntegrationGuideProps {
  memberName: string
  onVoiceEnabled: (enabled: boolean) => void
  onComplete: () => void
}

export default function VoiceIntegrationGuide({ memberName, onVoiceEnabled, onComplete }: VoiceIntegrationGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<VoiceRecording[]>([])
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)
  const [selectedRecording, setSelectedRecording] = useState<VoiceRecording | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const steps = [
    {
      id: 'introduction',
      title: 'Adding Their Voice',
      description: 'Learn how voice integration works and what you\'ll need'
    },
    {
      id: 'recording',
      title: 'Voice Recordings',
      description: 'Record or upload audio of their voice speaking'
    },
    {
      id: 'analysis',
      title: 'Voice Analysis',
      description: 'We analyze the recordings to understand their voice characteristics'
    },
    {
      id: 'completion',
      title: 'Voice Integration Complete',
      description: 'Your AI echo can now speak with their voice!'
    }
  ]

  const recordingPrompts = [
    {
      category: 'conversational-warmth',
      title: 'Conversational & Warm',
      prompt: 'Have them talk about a happy family memory or describe something they love',
      duration: '30-60 seconds',
      examples: [
        'Tell me about your favorite family tradition',
        'What\'s your happiest memory?',
        'Describe your garden or hobby'
      ]
    },
    {
      category: 'wisdom-advice',
      title: 'Wisdom & Advice',
      prompt: 'Record them giving advice or sharing life wisdom',
      duration: '60-90 seconds',
      examples: [
        'What advice would you give to someone starting their career?',
        'What\'s the most important thing in life?',
        'Share a life lesson you\'ve learned'
      ]
    },
    {
      category: 'emotional-expression',
      title: 'Emotional Expression',
      prompt: 'Capture different emotions - laughter, concern, excitement',
      duration: '45-75 seconds',
      examples: [
        'Tell a funny story that makes you laugh',
        'Express concern about something important',
        'Share exciting news or plans'
      ]
    },
    {
      category: 'reading-natural',
      title: 'Natural Reading',
      prompt: 'Have them read something meaningful naturally',
      duration: '60-90 seconds',
      examples: [
        'Read a favorite poem or quote',
        'Read a story they love',
        'Read a letter or passage that\'s meaningful to them'
      ]
    }
  ]

  useEffect(() => {
    // Initialize with some sample recordings
    const sampleRecordings: VoiceRecording[] = [
      {
        id: '1',
        name: 'Family Story Recording',
        duration: 45,
        quality: 'excellent',
        emotionalTone: 'warm',
        uploadDate: new Date().toISOString(),
        processed: true
      },
      {
        id: '2',
        name: 'Life Advice Recording',
        duration: 62,
        quality: 'good',
        emotionalTone: 'wise',
        uploadDate: new Date().toISOString(),
        processed: true
      }
    ]
    setRecordings(sampleRecordings)

    // Mock voice profile
    setVoiceProfile({
      memberName,
      totalRecordings: 2,
      totalDuration: 107,
      qualityScore: 89,
      emotionalRange: ['warm', 'wise', 'gentle'],
      trainingProgress: 75,
      voiceCharacteristics: {
        pitch: 'medium',
        pace: 'moderate',
        warmth: 85,
        clarity: 92
      }
    })
  }, [memberName])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Create new recording
        const newRecording: VoiceRecording = {
          id: Date.now().toString(),
          name: `Recording ${recordings.length + 1}`,
          duration: recordingTime,
          quality: 'good',
          emotionalTone: 'natural',
          uploadDate: new Date().toISOString(),
          processed: false,
          audioUrl
        }
        
        setRecordings(prev => [...prev, newRecording])
        processRecording(newRecording)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const processRecording = (recording: VoiceRecording) => {
    setIsProcessing(true)
    // Simulate processing
    setTimeout(() => {
      setRecordings(prev => 
        prev.map(r => 
          r.id === recording.id 
            ? { ...r, processed: true, quality: 'excellent', emotionalTone: 'warm' }
            : r
        )
      )
      setIsProcessing(false)
    }, 3000)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-hope-100 text-hope-800'
      case 'fair': return 'bg-memory-100 text-memory-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-peace-100 text-peace-800'
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleSkipVoice = () => {
    onVoiceEnabled(false)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-heaven-gradient p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-embrace px-6 py-3">
            <Volume2 className="w-6 h-6 text-hope-600" />
            <span className="text-lg font-gentle text-peace-800">Voice Integration</span>
          </div>
          <h1 className="text-4xl font-gentle text-peace-900">
            Adding {memberName}'s Voice
          </h1>
          <p className="text-xl text-peace-700 max-w-2xl mx-auto">
            Help their AI echo sound just like them with voice recordings
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-3 ${
                    index <= currentStep ? 'text-hope-700' : 'text-peace-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index < currentStep ? 'bg-green-100 text-green-600' :
                      index === currentStep ? 'bg-hope-100 text-hope-600' :
                      'bg-peace-100 text-peace-400'
                    }`}>
                      {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <div className="hidden md:block">
                      <div className="font-gentle">{step.title}</div>
                      <div className="text-xs text-peace-600">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-green-300' : 'bg-peace-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                  <Heart className="w-5 h-5 text-hope-600" />
                  Why Add Voice?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-hope-500 rounded-full mt-2"></div>
                    <p className="text-peace-700 font-supportive">
                      Hear their actual voice when the AI echo responds to you
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-hope-500 rounded-full mt-2"></div>
                    <p className="text-peace-700 font-supportive">
                      Captures their unique speaking style, pace, and warmth
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-hope-500 rounded-full mt-2"></div>
                    <p className="text-peace-700 font-supportive">
                      Makes conversations feel more natural and comforting
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-hope-500 rounded-full mt-2"></div>
                    <p className="text-peace-700 font-supportive">
                      Preserves the emotional connection of hearing their voice
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                  <Info className="w-5 h-5 text-comfort-600" />
                  What You'll Need
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-hope-50 rounded-embrace">
                  <h4 className="font-gentle text-peace-800 mb-2">Ideal Recordings:</h4>
                  <ul className="space-y-1 text-sm text-peace-700">
                    <li>• 3-5 recordings, 30-90 seconds each</li>
                    <li>• Natural conversation or storytelling</li>
                    <li>• Clear audio without background noise</li>
                    <li>• Different emotional tones (happy, wise, gentle)</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-comfort-50 rounded-embrace">
                  <h4 className="font-gentle text-peace-800 mb-2">Recording Tips:</h4>
                  <ul className="space-y-1 text-sm text-peace-700">
                    <li>• Use a quiet room</li>
                    <li>• Hold device close but not too close</li>
                    <li>• Let them speak naturally</li>
                    <li>• Include laughter and natural pauses</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <Tabs defaultValue="record" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="record">Record Now</TabsTrigger>
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
              </TabsList>

              <TabsContent value="record">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Recording Interface */}
                  <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                        <Mic className="w-5 h-5 text-hope-600" />
                        Voice Recording
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center space-y-4">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
                          isRecording ? 'bg-red-100 animate-pulse' : 'bg-hope-100'
                        }`}>
                          {isRecording ? (
                            <Square className="w-8 h-8 text-red-600" />
                          ) : (
                            <Mic className="w-8 h-8 text-hope-600" />
                          )}
                        </div>
                        
                        {isRecording && (
                          <div className="space-y-2">
                            <div className="text-2xl font-gentle text-red-600">
                              {formatDuration(recordingTime)}
                            </div>
                            <div className="text-sm text-peace-600">Recording...</div>
                          </div>
                        )}
                        
                        <Button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-full ${
                            isRecording 
                              ? 'bg-red-500 hover:bg-red-600' 
                              : 'bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600'
                          } text-white rounded-embrace font-supportive`}
                        >
                          {isRecording ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Recording
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4 mr-2" />
                              Start Recording
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recording Prompts */}
                  <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                        <Sparkles className="w-5 h-5 text-comfort-600" />
                        Recording Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recordingPrompts.map((prompt, index) => (
                          <div key={prompt.category} className="p-4 bg-peace-50 rounded-embrace">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-gentle text-peace-800">{prompt.title}</h4>
                              <Badge className="bg-hope-100 text-hope-800">
                                {prompt.duration}
                              </Badge>
                            </div>
                            <p className="text-sm text-peace-700 mb-3">{prompt.prompt}</p>
                            <div className="space-y-1">
                              <div className="text-xs text-peace-600 font-supportive">Examples:</div>
                              {prompt.examples.map((example, i) => (
                                <div key={i} className="text-xs text-peace-600 pl-2">
                                  • {example}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="upload">
                <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                      <Upload className="w-5 h-5 text-hope-600" />
                      Upload Voice Files
                    </CardTitle>
                    <CardDescription className="text-peace-700 font-supportive">
                      Upload existing audio files of {memberName}'s voice
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-peace-300 rounded-embrace p-8 text-center">
                      <Upload className="w-12 h-12 text-peace-400 mx-auto mb-4" />
                      <p className="text-peace-700 font-supportive mb-4">
                        Drag and drop audio files here, or click to browse
                      </p>
                      <Button variant="outline" className="rounded-embrace">
                        Choose Files
                      </Button>
                      <p className="text-xs text-peace-500 mt-4">
                        Supported formats: MP3, WAV, M4A (max 50MB each)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Existing Recordings */}
            {recordings.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                    <FileAudio className="w-5 h-5 text-comfort-600" />
                    Your Voice Recordings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recordings.map((recording) => (
                      <div key={recording.id} className="flex items-center justify-between p-4 bg-peace-50 rounded-embrace">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            recording.processed ? 'bg-green-100' : 'bg-hope-100'
                          }`}>
                            {recording.processed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-hope-600 animate-spin" />
                            )}
                          </div>
                          <div>
                            <div className="font-gentle text-peace-800">{recording.name}</div>
                            <div className="text-sm text-peace-600">
                              {formatDuration(recording.duration)} • {recording.emotionalTone}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getQualityColor(recording.quality)}>
                            {recording.quality}
                          </Badge>
                          {recording.audioUrl && (
                            <Button variant="outline" size="sm" className="rounded-embrace">
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {currentStep === 2 && voiceProfile && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                  <Zap className="w-5 h-5 text-hope-600" />
                  Voice Analysis Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-hope-100 rounded-full flex items-center justify-center mx-auto">
                    <Volume2 className="w-10 h-10 text-hope-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-2xl font-gentle text-hope-700 mb-2">
                      {voiceProfile.trainingProgress}% Complete
                    </div>
                    <Progress value={voiceProfile.trainingProgress} className="h-3" />
                  </div>
                  <p className="text-peace-700 font-supportive">
                    Analyzing {memberName}'s voice characteristics and speech patterns...
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Voice Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-hope-50 rounded-embrace">
                    <div className="text-lg font-gentle text-hope-700">{voiceProfile.totalRecordings}</div>
                    <div className="text-xs text-hope-600">Recordings</div>
                  </div>
                  <div className="text-center p-3 bg-comfort-50 rounded-embrace">
                    <div className="text-lg font-gentle text-comfort-700">{voiceProfile.qualityScore}%</div>
                    <div className="text-xs text-comfort-600">Quality Score</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-gentle text-peace-800">Voice Characteristics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-peace-600">Warmth</span>
                      <span className="text-sm text-peace-800">{voiceProfile.voiceCharacteristics.warmth}%</span>
                    </div>
                    <Progress value={voiceProfile.voiceCharacteristics.warmth} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-peace-600">Clarity</span>
                      <span className="text-sm text-peace-800">{voiceProfile.voiceCharacteristics.clarity}%</span>
                    </div>
                    <Progress value={voiceProfile.voiceCharacteristics.clarity} className="h-2" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {voiceProfile.emotionalRange.map((emotion) => (
                    <Badge key={emotion} className="bg-memory-100 text-memory-800 capitalize">
                      {emotion}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 3 && (
          <Card className="bg-gradient-to-r from-green-100 to-hope-100 border-0 shadow-xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Volume2 className="w-12 h-12 text-green-600" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-gentle text-peace-800">
                  {memberName}'s Voice is Ready!
                </h3>
                <p className="text-peace-700 font-supportive max-w-2xl mx-auto">
                  We've successfully captured their voice characteristics and emotional expressions. 
                  Their AI echo can now speak with their unique voice, bringing an extra layer of comfort to your conversations.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {voiceProfile && (
                  <>
                    <div className="text-center p-4 bg-white/70 rounded-embrace">
                      <div className="text-2xl font-gentle text-green-600">{voiceProfile.totalRecordings}</div>
                      <div className="text-sm text-peace-600">Voice Samples</div>
                    </div>
                    <div className="text-center p-4 bg-white/70 rounded-embrace">
                      <div className="text-2xl font-gentle text-green-600">{voiceProfile.qualityScore}%</div>
                      <div className="text-sm text-peace-600">Voice Quality</div>
                    </div>
                    <div className="text-center p-4 bg-white/70 rounded-embrace">
                      <div className="text-2xl font-gentle text-green-600">{voiceProfile.emotionalRange.length}</div>
                      <div className="text-sm text-peace-600">Emotional Tones</div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          {currentStep === 0 ? (
            <Button 
              variant="outline" 
              onClick={handleSkipVoice}
              className="rounded-embrace font-supportive"
            >
              Skip Voice Integration
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(currentStep - 1)}
              className="rounded-embrace font-supportive"
            >
              Previous
            </Button>
          )}

          <Button 
            onClick={handleNext}
            disabled={currentStep === 1 && recordings.length === 0}
            className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Voice Setup
              </>
            ) : currentStep === 1 ? (
              recordings.length > 0 ? 'Analyze Voice' : 'Add Recordings First'
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}