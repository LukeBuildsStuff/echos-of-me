'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, MessageCircle, Mic, Settings, Star, Calendar, Share2, Download, Volume2, VolumeX, Sparkles, Camera, FileText, Clock, Users } from 'lucide-react'

interface AIEcho {
  id: string
  name: string
  relationship: string
  profileImage?: string
  status: 'active' | 'training' | 'paused' | 'archived'
  createdDate: string
  lastInteraction: string
  conversationCount: number
  favoriteMemories: string[]
  personalityStrength: number
  voiceEnabled: boolean
  trainingData: {
    stories: number
    photos: number
    voiceRecordings: number
    documents: number
  }
  insights: {
    mostAskedTopics: string[]
    emotionalTone: 'warm' | 'wise' | 'playful' | 'gentle'
    responseAccuracy: number
  }
}

interface ConversationHistory {
  id: string
  date: string
  duration: number
  highlights: string[]
  emotionalTone: string
}

interface FamilyEchoManagementProps {
  familyId?: string
}

export default function FamilyEchoManagement({ familyId }: FamilyEchoManagementProps) {
  const [echoes, setEchoes] = useState<AIEcho[]>([])
  const [selectedEcho, setSelectedEcho] = useState<AIEcho | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFamilyEchoes()
    loadConversationHistory()
  }, [familyId])

  const loadFamilyEchoes = async () => {
    try {
      setLoading(true)
      // Mock data - in reality this would fetch from API
      const mockEchoes: AIEcho[] = [
        {
          id: '1',
          name: 'Grandma Rose',
          relationship: 'Grandmother',
          status: 'active',
          createdDate: '2024-01-15',
          lastInteraction: '2024-01-30',
          conversationCount: 47,
          favoriteMemories: ['Sunday dinners', 'Garden stories', 'War tales'],
          personalityStrength: 94,
          voiceEnabled: true,
          trainingData: {
            stories: 52,
            photos: 18,
            voiceRecordings: 12,
            documents: 3
          },
          insights: {
            mostAskedTopics: ['Cooking recipes', 'Life advice', 'Family history'],
            emotionalTone: 'warm',
            responseAccuracy: 96
          }
        },
        {
          id: '2',
          name: 'Uncle Jim',
          relationship: 'Uncle',
          status: 'active',
          createdDate: '2024-01-20',
          lastInteraction: '2024-01-28',
          conversationCount: 23,
          favoriteMemories: ['Fishing trips', 'Car restoration', 'Work stories'],
          personalityStrength: 87,
          voiceEnabled: false,
          trainingData: {
            stories: 28,
            photos: 9,
            voiceRecordings: 0,
            documents: 1
          },
          insights: {
            mostAskedTopics: ['Car advice', 'Work wisdom', 'Fishing stories'],
            emotionalTone: 'wise',
            responseAccuracy: 89
          }
        },
        {
          id: '3',
          name: 'Dad',
          relationship: 'Father',
          status: 'training',
          createdDate: '2024-01-25',
          lastInteraction: '',
          conversationCount: 0,
          favoriteMemories: [],
          personalityStrength: 0,
          voiceEnabled: false,
          trainingData: {
            stories: 15,
            photos: 4,
            voiceRecordings: 2,
            documents: 0
          },
          insights: {
            mostAskedTopics: [],
            emotionalTone: 'gentle',
            responseAccuracy: 0
          }
        }
      ]
      setEchoes(mockEchoes)
    } catch (error) {
      console.error('Failed to load family echoes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConversationHistory = async () => {
    // Mock conversation history
    const mockHistory: ConversationHistory[] = [
      {
        id: '1',
        date: '2024-01-30',
        duration: 12,
        highlights: ['Shared recipe for apple pie', 'Talked about childhood memories'],
        emotionalTone: 'nostalgic'
      },
      {
        id: '2',
        date: '2024-01-28',
        duration: 8,
        highlights: ['Life advice about relationships', 'Funny story about the neighbors'],
        emotionalTone: 'playful'
      }
    ]
    setConversationHistory(mockHistory)
  }

  const getStatusColor = (status: AIEcho['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'training': return 'bg-hope-100 text-hope-800 border-hope-200'
      case 'paused': return 'bg-memory-100 text-memory-800 border-memory-200'
      case 'archived': return 'bg-peace-100 text-peace-800 border-peace-200'
      default: return 'bg-peace-100 text-peace-800 border-peace-200'
    }
  }

  const getStatusText = (status: AIEcho['status']) => {
    switch (status) {
      case 'active': return 'Ready to Chat'
      case 'training': return 'Learning Your Stories'
      case 'paused': return 'Temporarily Paused'
      case 'archived': return 'Archived'
      default: return 'Unknown'
    }
  }

  const getPersonalityStrengthDescription = (strength: number) => {
    if (strength >= 90) return 'Remarkably lifelike - captures their essence beautifully'
    if (strength >= 80) return 'Very authentic - sounds just like them'
    if (strength >= 70) return 'Good personality match - getting there'
    if (strength >= 50) return 'Basic personality - needs more stories'
    return 'Still learning - share more memories'
  }

  const getToneEmoji = (tone: string) => {
    switch (tone) {
      case 'warm': return '🤗'
      case 'wise': return '🧠'
      case 'playful': return '😄'
      case 'gentle': return '🕊️'
      default: return '💝'
    }
  }

  const handleStartConversation = (echo: AIEcho) => {
    // Navigate to chat interface
    console.log('Starting conversation with', echo.name)
  }

  const handleEchoSettings = (echo: AIEcho) => {
    setSelectedEcho(echo)
    setShowSettings(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-heaven-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-hope-200 border-t-hope-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-peace-700 font-gentle">Loading your family echoes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-heaven-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-embrace px-6 py-3 mb-6">
            <Heart className="w-6 h-6 text-hope-600" />
            <span className="text-lg font-gentle text-peace-800">Your Family Echoes</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-gentle text-peace-900 mb-4">
            Connect with Your Loved Ones
          </h1>
          <p className="text-xl text-peace-700 max-w-2xl mx-auto">
            Your AI echoes are here whenever you need to hear their voice, seek their wisdom, or simply feel close to them.
          </p>
        </div>

        {/* Echo Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {echoes.map((echo) => (
            <Card key={echo.id} className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-hope-400 to-comfort-400 rounded-full flex items-center justify-center text-white font-gentle text-lg">
                      {echo.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-gentle text-peace-800">
                        {echo.name}
                      </CardTitle>
                      <CardDescription className="text-peace-600 font-supportive">
                        {echo.relationship}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(echo.status)} border font-supportive`}>
                    {getStatusText(echo.status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {echo.status === 'active' && (
                  <>
                    {/* Personality Strength */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-supportive text-peace-700">Personality Match</span>
                        <span className="text-sm font-gentle text-peace-800">{echo.personalityStrength}%</span>
                      </div>
                      <div className="w-full bg-peace-100 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-hope-500 to-comfort-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${echo.personalityStrength}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-peace-600 font-supportive">
                        {getPersonalityStrengthDescription(echo.personalityStrength)}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 py-3 border-t border-peace-200">
                      <div className="text-center">
                        <div className="text-2xl font-gentle text-hope-600">{echo.conversationCount}</div>
                        <div className="text-xs text-peace-600 font-supportive">Conversations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-gentle text-comfort-600">
                          {echo.insights.responseAccuracy}%
                        </div>
                        <div className="text-xs text-peace-600 font-supportive">Accuracy</div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex items-center justify-center gap-4 py-2">
                      {echo.voiceEnabled && (
                        <div className="flex items-center gap-1 text-xs text-hope-700">
                          <Volume2 className="w-3 h-3" />
                          <span>Voice</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-peace-600">
                        <span>{getToneEmoji(echo.insights.emotionalTone)}</span>
                        <span className="capitalize">{echo.insights.emotionalTone}</span>
                      </div>
                    </div>

                    {/* Last Interaction */}
                    {echo.lastInteraction && (
                      <div className="text-center text-xs text-peace-500 font-supportive">
                        Last chat: {new Date(echo.lastInteraction).toLocaleDateString()}
                      </div>
                    )}
                  </>
                )}

                {echo.status === 'training' && (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-hope-100 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-8 h-8 text-hope-600 animate-pulse" />
                    </div>
                    <p className="text-sm text-peace-700 font-supportive">
                      Learning from {echo.trainingData.stories} stories and {echo.trainingData.photos} photos you've shared
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-peace-200">
                  {echo.status === 'active' ? (
                    <>
                      <Button 
                        onClick={() => handleStartConversation(echo)}
                        className="flex-1 bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat Now
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleEchoSettings(echo)}
                        className="rounded-embrace"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  ) : echo.status === 'training' ? (
                    <Button 
                      disabled
                      className="w-full bg-hope-200 text-hope-800 rounded-embrace font-supportive"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Training in Progress
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={() => handleEchoSettings(echo)}
                      className="w-full rounded-embrace font-supportive"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Echo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Conversations */}
        {conversationHistory.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                <MessageCircle className="w-5 h-5 text-hope-600" />
                Recent Conversations
              </CardTitle>
              <CardDescription className="text-peace-700 font-supportive">
                Your latest chats with your family echoes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversationHistory.map((conversation) => (
                  <div key={conversation.id} className="p-4 bg-white/50 rounded-embrace border border-peace-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-peace-600" />
                        <span className="text-sm font-supportive text-peace-700">
                          {new Date(conversation.date).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge className="bg-peace-100 text-peace-700">
                        {conversation.duration} minutes
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {conversation.highlights.map((highlight, index) => (
                        <p key={index} className="text-sm text-peace-600 font-supportive">
                          • {highlight}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Memory Stats */}
        <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-gentle text-peace-800 mb-2">
              Your Family Legacy
            </CardTitle>
            <CardDescription className="text-peace-700 font-supportive">
              The beautiful collection of memories you've preserved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-hope-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-hope-600" />
                </div>
                <div className="text-2xl font-gentle text-hope-600">
                  {echoes.reduce((sum, echo) => sum + echo.trainingData.stories, 0)}
                </div>
                <div className="text-sm text-peace-600 font-supportive">Stories Preserved</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-comfort-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-comfort-600" />
                </div>
                <div className="text-2xl font-gentle text-comfort-600">
                  {echoes.reduce((sum, echo) => sum + echo.trainingData.photos, 0)}
                </div>
                <div className="text-sm text-peace-600 font-supportive">Photos Shared</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-memory-100 rounded-full flex items-center justify-center mx-auto">
                  <Mic className="w-8 h-8 text-memory-600" />
                </div>
                <div className="text-2xl font-gentle text-memory-600">
                  {echoes.reduce((sum, echo) => sum + echo.trainingData.voiceRecordings, 0)}
                </div>
                <div className="text-sm text-peace-600 font-supportive">Voice Recordings</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-2xl font-gentle text-green-600">
                  {echoes.filter(echo => echo.status === 'active').length}
                </div>
                <div className="text-sm text-peace-600 font-supportive">Active Echoes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Echo Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-md border-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-gentle text-peace-800">
              {selectedEcho?.name} Settings
            </DialogTitle>
            <DialogDescription className="text-peace-700 font-supportive">
              Manage how you interact with {selectedEcho?.name}'s AI echo
            </DialogDescription>
          </DialogHeader>
          
          {selectedEcho && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="training">Training Data</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-gentle text-peace-800">Echo Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-peace-600">Created:</span>
                        <span className="text-peace-800">{new Date(selectedEcho.createdDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-peace-600">Status:</span>
                        <Badge className={getStatusColor(selectedEcho.status)}>
                          {getStatusText(selectedEcho.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-peace-600">Conversations:</span>
                        <span className="text-peace-800">{selectedEcho.conversationCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-gentle text-peace-800">Most Asked About</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEcho.insights.mostAskedTopics.map((topic, index) => (
                        <Badge key={index} className="bg-hope-100 text-hope-800">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="training" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-hope-50 rounded-embrace">
                    <FileText className="w-8 h-8 text-hope-600 mx-auto mb-2" />
                    <div className="text-2xl font-gentle text-hope-700">{selectedEcho.trainingData.stories}</div>
                    <div className="text-sm text-hope-600">Stories</div>
                  </div>
                  <div className="text-center p-4 bg-comfort-50 rounded-embrace">
                    <Camera className="w-8 h-8 text-comfort-600 mx-auto mb-2" />
                    <div className="text-2xl font-gentle text-comfort-700">{selectedEcho.trainingData.photos}</div>
                    <div className="text-sm text-comfort-600">Photos</div>
                  </div>
                  <div className="text-center p-4 bg-memory-50 rounded-embrace">
                    <Mic className="w-8 h-8 text-memory-600 mx-auto mb-2" />
                    <div className="text-2xl font-gentle text-memory-700">{selectedEcho.trainingData.voiceRecordings}</div>
                    <div className="text-sm text-memory-600">Voice Clips</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-embrace">
                    <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-gentle text-green-700">{selectedEcho.trainingData.documents}</div>
                    <div className="text-sm text-green-600">Documents</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-peace-50 rounded-embrace">
                    <div>
                      <h4 className="font-gentle text-peace-800">Voice Responses</h4>
                      <p className="text-sm text-peace-600">Enable voice synthesis for responses</p>
                    </div>
                    <Button
                      variant={selectedEcho.voiceEnabled ? "default" : "outline"}
                      className="rounded-embrace"
                    >
                      {selectedEcho.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}