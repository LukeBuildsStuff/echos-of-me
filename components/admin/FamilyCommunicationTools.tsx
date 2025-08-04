'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Heart, 
  MessageSquare, 
  Phone, 
  Mail,
  Send,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  Sparkles,
  Smile,
  Shield,
  HelpCircle,
  FileText,
  Calendar,
  User
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface CommunicationTemplate {
  id: string
  name: string
  category: 'crisis_outreach' | 'status_update' | 'resolution_notice' | 'empathy_message' | 'follow_up'
  subject: string
  message: string
  tone: 'compassionate' | 'urgent' | 'informative' | 'reassuring'
  grief_sensitive: boolean
  auto_personalization: boolean
  estimated_read_time: number
  usage_count: number
}

interface FamilyCommunication {
  id: number
  family_id: string
  family_email: string
  family_name?: string
  error_id: string
  communication_type: 'email' | 'phone' | 'in_app' | 'sms'
  template_used?: string
  subject: string
  message: string
  sent_at: string
  read_at?: string
  responded_at?: string
  sentiment_score?: number
  family_satisfaction?: number
  follow_up_needed: boolean
  crisis_related: boolean
  grief_context: boolean
  response_message?: string
}

export default function FamilyCommunicationTools() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [communications, setCommunications] = useState<FamilyCommunication[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'history'>('send')
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    fetchCommunicationData()
  }, [])

  const fetchCommunicationData = async () => {
    try {
      const [templatesRes, communicationsRes] = await Promise.all([
        fetch('/api/admin/family-communication/templates'),
        fetch('/api/admin/family-communication/history')
      ])
      
      const templatesData = await templatesRes.json()
      const communicationsData = await communicationsRes.json()
      
      if (templatesData.success) setTemplates(templatesData.data)
      if (communicationsData.success) setCommunications(communicationsData.data)
    } catch (error) {
      console.error('Failed to fetch communication data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendCommunication = async (familyEmails: string[], template: CommunicationTemplate, customizations?: any) => {
    try {
      setComposing(true)
      const response = await fetch('/api/admin/family-communication/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: familyEmails,
          template_id: template.id,
          customizations,
          grief_sensitive: template.grief_sensitive
        })
      })
      
      if (response.ok) {
        fetchCommunicationData()
        setSelectedFamilies([])
        setCustomMessage('')
      }
    } catch (error) {
      console.error('Failed to send communication:', error)
    } finally {
      setComposing(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case 'crisis_outreach': return AlertTriangle
      case 'status_update': return Clock
      case 'resolution_notice': return CheckCircle
      case 'empathy_message': return Heart
      case 'follow_up': return MessageSquare
      default: return FileText
    }
  }

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'compassionate': return griefSensitiveColors.comfort[500]
      case 'urgent': return griefSensitiveColors.warning[500]
      case 'informative': return griefSensitiveColors.primary[500]
      case 'reassuring': return griefSensitiveColors.hope[500]
      default: return griefSensitiveColors.peace[500]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 animate-pulse mx-auto mb-4" style={{ color: griefSensitiveColors.comfort[500] }} />
          <p style={{ color: griefSensitiveColors.peace[600] }}>Loading family communication tools...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: griefSensitiveColors.comfort[50],
          border: `1px solid ${griefSensitiveColors.comfort[200]}`
        }}
      >
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
            >
              <Heart className="h-8 w-8" style={{ color: griefSensitiveColors.comfort[600] }} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: griefSensitiveColors.peace[800] }}>
                Family Communication Center
              </h1>
              <p className="text-lg" style={{ color: griefSensitiveColors.peace[600] }}>
                Compassionate outreach and support during technical difficulties
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={activeTab === 'send' ? 'default' : 'outline'}
              onClick={() => setActiveTab('send')}
              className="flex items-center gap-2"
              style={{
                backgroundColor: activeTab === 'send' ? griefSensitiveColors.comfort[500] : 'transparent',
                color: activeTab === 'send' ? 'white' : griefSensitiveColors.comfort[600]
              }}
            >
              <Send className="h-4 w-4" />
              Send Message
            </Button>
            <Button
              variant={activeTab === 'templates' ? 'default' : 'outline'}
              onClick={() => setActiveTab('templates')}
              className="flex items-center gap-2"
              style={{
                backgroundColor: activeTab === 'templates' ? griefSensitiveColors.memory[500] : 'transparent',
                color: activeTab === 'templates' ? 'white' : griefSensitiveColors.memory[600]
              }}
            >
              <FileText className="h-4 w-4" />
              Templates
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-2"
              style={{
                backgroundColor: activeTab === 'history' ? griefSensitiveColors.hope[500] : 'transparent',
                color: activeTab === 'history' ? 'white' : griefSensitiveColors.hope[600]
              }}
            >
              <Clock className="h-4 w-4" />
              Communication History
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Send Message Tab */}
      {activeTab === 'send' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Template Selection */}
          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
                <Sparkles className="h-5 w-5" />
                Choose Compassionate Template
              </CardTitle>
              <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                Select a pre-crafted message designed with empathy and understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((template) => {
                  const TemplateIcon = getTemplateIcon(template.category)
                  
                  return (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedTemplate?.id === template.id ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: selectedTemplate?.id === template.id ? griefSensitiveColors.comfort[50] : 'white',
                        borderColor: selectedTemplate?.id === template.id ? griefSensitiveColors.comfort[300] : griefSensitiveColors.peace[200],
                        ringColor: griefSensitiveColors.comfort[300]
                      }}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <TemplateIcon className="h-5 w-5 mt-1" style={{ color: getToneColor(template.tone) }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                              {template.name}
                            </h4>
                            {template.grief_sensitive && (
                              <Badge 
                                className="text-xs px-2 py-1"
                                style={{
                                  backgroundColor: griefSensitiveColors.comfort[100],
                                  color: griefSensitiveColors.comfort[700]
                                }}
                              >
                                <Heart className="h-3 w-3 mr-1" />
                                Grief-Sensitive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mb-2" style={{ color: griefSensitiveColors.peace[600] }}>
                            {template.subject}
                          </p>
                          <div className="flex items-center gap-3 text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {template.estimated_read_time}m read
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Used {template.usage_count} times
                            </span>
                            <Badge 
                              className="text-xs px-2 py-1"
                              style={{
                                backgroundColor: getToneColor(template.tone),
                                color: 'white'
                              }}
                            >
                              {template.tone}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
                <Edit className="h-5 w-5" />
                Compose Family Message
              </CardTitle>
              <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                Personalize your message with warmth and understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: griefSensitiveColors.peace[700] }}>
                      Subject Line
                    </label>
                    <Input
                      value={selectedTemplate.subject}
                      className="border-2"
                      style={{ borderColor: griefSensitiveColors.peace[200] }}
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: griefSensitiveColors.peace[700] }}>
                      Message Content
                    </label>
                    <Textarea
                      value={selectedTemplate.message}
                      className="min-h-40 border-2 resize-none"
                      style={{ borderColor: griefSensitiveColors.peace[200] }}
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: griefSensitiveColors.peace[700] }}>
                      Additional Personal Note (Optional)
                    </label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add a personal touch to show extra care and understanding..."
                      className="min-h-24 border-2"
                      style={{ borderColor: griefSensitiveColors.peace[200] }}
                    />
                  </div>
                  
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: griefSensitiveColors.hope[50] }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Smile className="h-4 w-4" style={{ color: griefSensitiveColors.hope[500] }} />
                      <span className="text-sm font-medium" style={{ color: griefSensitiveColors.hope[700] }}>
                        Empathy Features Active
                      </span>
                    </div>
                    <ul className="text-xs space-y-1" style={{ color: griefSensitiveColors.peace[600] }}>
                      <li>• Automatic grief-sensitive language review</li>
                      <li>• Personalized family context insertion</li>
                      <li>• Tone analysis for maximum compassion</li>
                      <li>• Cultural sensitivity validation</li>
                    </ul>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-4">
                    <Button
                      onClick={() => sendCommunication(['family@example.com'], selectedTemplate, { personalNote: customMessage })}
                      disabled={composing}
                      style={{
                        backgroundColor: griefSensitiveColors.comfort[500],
                        color: 'white'
                      }}
                      className="flex items-center gap-2"
                    >
                      {composing ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          Sending with Care...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Compassionate Message
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: griefSensitiveColors.peace[300] }} />
                  <p style={{ color: griefSensitiveColors.peace[600] }}>
                    Select a template to begin composing your compassionate message
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
                  <FileText className="h-5 w-5" />
                  Compassionate Message Templates
                </CardTitle>
                <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                  Pre-crafted messages designed with empathy for families during technical difficulties
                </CardDescription>
              </div>
              <Button
                style={{
                  backgroundColor: griefSensitiveColors.memory[500],
                  color: 'white'
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const TemplateIcon = getTemplateIcon(template.category)
                
                return (
                  <Card 
                    key={template.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200"
                    style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <TemplateIcon className="h-5 w-5" style={{ color: getToneColor(template.tone) }} />
                          <div>
                            <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                              {template.name}
                            </h4>
                            <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                              {template.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-3" style={{ color: griefSensitiveColors.peace[600] }}>
                        {template.subject}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{
                            backgroundColor: getToneColor(template.tone),
                            color: 'white'
                          }}
                        >
                          {template.tone}
                        </Badge>
                        
                        {template.grief_sensitive && (
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{
                              backgroundColor: griefSensitiveColors.comfort[100],
                              color: griefSensitiveColors.comfort[700]
                            }}
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Grief-Sensitive
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                        <span>{template.usage_count} uses</span>
                        <span>{template.estimated_read_time}m read</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communication History Tab */}
      {activeTab === 'history' && (
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
              <Clock className="h-5 w-5" />
              Family Communication History
            </CardTitle>
            <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
              Track all compassionate outreach and family responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className="p-4 rounded-lg border transition-all duration-200 hover:shadow-sm"
                  style={{ 
                    backgroundColor: 'white',
                    border: `1px solid ${griefSensitiveColors.peace[200]}`
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
                      >
                        {comm.communication_type === 'email' && <Mail className="h-4 w-4" style={{ color: griefSensitiveColors.comfort[600] }} />}
                        {comm.communication_type === 'phone' && <Phone className="h-4 w-4" style={{ color: griefSensitiveColors.comfort[600] }} />}
                        {comm.communication_type === 'sms' && <MessageSquare className="h-4 w-4" style={{ color: griefSensitiveColors.comfort[600] }} />}
                        {comm.communication_type === 'in_app' && <Bell className="h-4 w-4" style={{ color: griefSensitiveColors.comfort[600] }} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                            {comm.family_name || comm.family_email}
                          </h4>
                          {comm.crisis_related && (
                            <Badge className="text-xs px-2 py-1 bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Crisis
                            </Badge>
                          )}
                          {comm.grief_context && (
                            <Badge 
                              className="text-xs px-2 py-1"
                              style={{
                                backgroundColor: griefSensitiveColors.comfort[100],
                                color: griefSensitiveColors.comfort[700]
                              }}
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              Grief-Sensitive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1" style={{ color: griefSensitiveColors.peace[600] }}>
                          {comm.subject}
                        </p>
                        <p className="text-sm line-clamp-2" style={{ color: griefSensitiveColors.peace[500] }}>
                          {comm.message}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                        {formatTimeAgo(comm.sent_at)}
                      </div>
                      {comm.read_at && (
                        <div className="flex items-center gap-1 text-xs mt-1" style={{ color: griefSensitiveColors.hope[600] }}>
                          <CheckCircle className="h-3 w-3" />
                          Read
                        </div>
                      )}
                      {comm.responded_at && (
                        <div className="flex items-center gap-1 text-xs mt-1" style={{ color: griefSensitiveColors.memory[600] }}>
                          <MessageSquare className="h-3 w-3" />
                          Replied
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {comm.response_message && (
                    <div 
                      className="p-3 rounded-lg mt-3"
                      style={{ backgroundColor: griefSensitiveColors.hope[50] }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" style={{ color: griefSensitiveColors.hope[600] }} />
                        <span className="text-sm font-medium" style={{ color: griefSensitiveColors.hope[700] }}>
                          Family Response
                        </span>
                        {comm.family_satisfaction && (
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{
                              backgroundColor: comm.family_satisfaction >= 4 ? griefSensitiveColors.hope[500] : griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                          >
                            {comm.family_satisfaction}/5 satisfaction
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {comm.response_message}
                      </p>
                    </div>
                  )}
                  
                  {comm.follow_up_needed && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg" style={{ backgroundColor: griefSensitiveColors.memory[50] }}>
                      <Calendar className="h-4 w-4" style={{ color: griefSensitiveColors.memory[600] }} />
                      <span className="text-sm font-medium" style={{ color: griefSensitiveColors.memory[700] }}>
                        Follow-up needed
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {communications.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: griefSensitiveColors.peace[300] }} />
                  <p style={{ color: griefSensitiveColors.peace[600] }}>
                    No family communications yet. Start reaching out with compassion when families need support.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}