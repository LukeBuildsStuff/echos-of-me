'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ErrorLoggingDashboard from '@/components/admin/ErrorLoggingDashboard'
import ErrorAnalyticsDashboard from '@/components/admin/ErrorAnalyticsDashboard'
import CrisisAlertSystem from '@/components/admin/CrisisAlertSystem'
import FamilyCommunicationTools from '@/components/admin/FamilyCommunicationTools'
import ErrorResolutionTracker from '@/components/admin/ErrorResolutionTracker'
import { 
  Shield, 
  BarChart3, 
  AlertTriangle, 
  Heart,
  Activity,
  Eye,
  TrendingUp,
  MessageSquare,
  Target,
  Bell,
  Menu,
  X
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

export default function ErrorMonitoringPage() {
  const [activeTab, setActiveTab] = useState('monitoring')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="container mx-auto px-4 py-4 lg:py-8">
      {/* Compassionate Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 lg:p-3 rounded-lg"
              style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
            >
              <Shield className="h-6 w-6 lg:h-8 lg:w-8" style={{ color: griefSensitiveColors.comfort[600] }} />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold" style={{ color: griefSensitiveColors.peace[800] }}>
                Family Guardian Error Monitoring
              </h1>
              <p className="text-sm lg:text-lg hidden sm:block" style={{ color: griefSensitiveColors.peace[600] }}>
                Protecting families through compassionate technical oversight and rapid issue resolution
              </p>
            </div>
          </div>
          
          {/* Mobile Menu Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Mission Statement */}
        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: griefSensitiveColors.comfort[50],
            border: `1px solid ${griefSensitiveColors.comfort[200]}`
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Heart className="h-6 w-6 mt-1" style={{ color: griefSensitiveColors.comfort[500] }} />
              <div>
                <h3 className="font-semibold mb-2" style={{ color: griefSensitiveColors.comfort[700] }}>
                  Our Promise to Families
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: griefSensitiveColors.peace[600] }}>
                  Every technical issue is treated with deep understanding of its emotional impact on grieving families. 
                  We monitor not just system health, but family well-being, ensuring that technical problems never become 
                  emotional burdens during vulnerable moments of remembrance and healing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <Card className="lg:hidden border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
            <CardContent className="p-4">
              <div className="grid gap-2">
                <Button
                  variant={activeTab === 'monitoring' ? 'default' : 'outline'}
                  onClick={() => { setActiveTab('monitoring'); setMobileMenuOpen(false) }}
                  className="w-full justify-start"
                  style={{
                    backgroundColor: activeTab === 'monitoring' ? griefSensitiveColors.comfort[500] : 'transparent',
                    color: activeTab === 'monitoring' ? 'white' : griefSensitiveColors.comfort[600]
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Real-Time Monitoring
                </Button>
                <Button
                  variant={activeTab === 'analytics' ? 'default' : 'outline'}
                  onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false) }}
                  className="w-full justify-start"
                  style={{
                    backgroundColor: activeTab === 'analytics' ? griefSensitiveColors.memory[500] : 'transparent',
                    color: activeTab === 'analytics' ? 'white' : griefSensitiveColors.memory[600]
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Family-Focused Analytics
                </Button>
                <Button
                  variant={activeTab === 'crisis' ? 'default' : 'outline'}
                  onClick={() => { setActiveTab('crisis'); setMobileMenuOpen(false) }}
                  className="w-full justify-start"
                  style={{
                    backgroundColor: activeTab === 'crisis' ? griefSensitiveColors.warning[500] : 'transparent',
                    color: activeTab === 'crisis' ? 'white' : griefSensitiveColors.warning[600]
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Crisis Alert System
                </Button>
                <Button
                  variant={activeTab === 'communication' ? 'default' : 'outline'}
                  onClick={() => { setActiveTab('communication'); setMobileMenuOpen(false) }}
                  className="w-full justify-start"
                  style={{
                    backgroundColor: activeTab === 'communication' ? griefSensitiveColors.comfort[500] : 'transparent',
                    color: activeTab === 'communication' ? 'white' : griefSensitiveColors.comfort[600]
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Family Communication
                </Button>
                <Button
                  variant={activeTab === 'resolution' ? 'default' : 'outline'}
                  onClick={() => { setActiveTab('resolution'); setMobileMenuOpen(false) }}
                  className="w-full justify-start"
                  style={{
                    backgroundColor: activeTab === 'resolution' ? griefSensitiveColors.memory[500] : 'transparent',
                    color: activeTab === 'resolution' ? 'white' : griefSensitiveColors.memory[600]
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Resolution Tracking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Desktop Navigation Tabs */}
        <TabsList className="hidden lg:grid w-full grid-cols-5">
          <TabsTrigger 
            value="monitoring" 
            className="flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'monitoring' ? griefSensitiveColors.comfort[500] : 'transparent',
              color: activeTab === 'monitoring' ? 'white' : griefSensitiveColors.comfort[600]
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden xl:inline">Real-Time</span> Monitoring
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'analytics' ? griefSensitiveColors.memory[500] : 'transparent',
              color: activeTab === 'analytics' ? 'white' : griefSensitiveColors.memory[600]
            }}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden xl:inline">Family</span> Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="crisis" 
            className="flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'crisis' ? griefSensitiveColors.warning[500] : 'transparent',
              color: activeTab === 'crisis' ? 'white' : griefSensitiveColors.warning[600]
            }}
          >
            <AlertTriangle className="h-4 w-4" />
            Crisis Alerts
          </TabsTrigger>
          <TabsTrigger 
            value="communication" 
            className="flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'communication' ? griefSensitiveColors.comfort[500] : 'transparent',
              color: activeTab === 'communication' ? 'white' : griefSensitiveColors.comfort[600]
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger 
            value="resolution" 
            className="flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'resolution' ? griefSensitiveColors.memory[500] : 'transparent',
              color: activeTab === 'resolution' ? 'white' : griefSensitiveColors.memory[600]
            }}
          >
            <Target className="h-4 w-4" />
            Resolution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">
          <Card 
            className="border-0 shadow-sm"
            style={{ 
              backgroundColor: 'white',
              border: `1px solid ${griefSensitiveColors.peace[200]}`
            }}
          >
            <CardHeader>
              <CardTitle 
                className="flex items-center gap-2"
                style={{ color: griefSensitiveColors.peace[700] }}
              >
                <Activity className="h-5 w-5" />
                Live Error Monitoring with Family Context
              </CardTitle>
              <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                Monitor all system errors with special attention to those affecting families in grief. 
                Errors are automatically categorized by their emotional impact and crisis potential.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: griefSensitiveColors.warning[50] }}
                >
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: griefSensitiveColors.warning[500] }} />
                  <div className="text-2xl font-semibold mb-1" style={{ color: griefSensitiveColors.warning[600] }}>
                    Crisis Detection
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Immediate alerts for errors affecting grieving families
                  </p>
                </div>
                
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: griefSensitiveColors.comfort[50] }}
                >
                  <Heart className="h-8 w-8 mx-auto mb-2" style={{ color: griefSensitiveColors.comfort[500] }} />
                  <div className="text-2xl font-semibold mb-1" style={{ color: griefSensitiveColors.comfort[600] }}>
                    Grief Context
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Automatically identifies memory and legacy-related errors
                  </p>
                </div>
                
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: griefSensitiveColors.hope[50] }}
                >
                  <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: griefSensitiveColors.hope[500] }} />
                  <div className="text-2xl font-semibold mb-1" style={{ color: griefSensitiveColors.hope[600] }}>
                    Family Protection
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Comprehensive monitoring of all family-facing features
                  </p>
                </div>
              </div>
              
              <ErrorLoggingDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card 
            className="border-0 shadow-sm"
            style={{ 
              backgroundColor: 'white',
              border: `1px solid ${griefSensitiveColors.peace[200]}`
            }}
          >
            <CardHeader>
              <CardTitle 
                className="flex items-center gap-2"
                style={{ color: griefSensitiveColors.peace[700] }}
              >
                <TrendingUp className="h-5 w-5" />
                Family-Centered Error Analytics
              </CardTitle>
              <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                Deep insights into how technical issues affect families, with metrics designed around 
                family well-being, grief sensitivity, and emotional impact assessment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: griefSensitiveColors.memory[50] }}
                >
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" style={{ color: griefSensitiveColors.memory[500] }} />
                  <div className="text-2xl font-semibold mb-1" style={{ color: griefSensitiveColors.memory[600] }}>
                    Impact Trends
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Track how errors affect family experiences over time
                  </p>
                </div>
                
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: griefSensitiveColors.comfort[50] }}
                >
                  <Heart className="h-8 w-8 mx-auto mb-2" style={{ color: griefSensitiveColors.comfort[500] }} />
                  <div className="text-2xl font-semibold mb-1" style={{ color: griefSensitiveColors.comfort[600] }}>
                    Response Quality
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Measure compassionate response times and family satisfaction
                  </p>
                </div>
                
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: griefSensitiveColors.hope[50] }}
                >
                  <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: griefSensitiveColors.hope[500] }} />
                  <div className="text-2xl font-semibold mb-1" style={{ color: griefSensitiveColors.hope[600] }}>
                    Prevention Insights
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Identify patterns to prevent future family disruptions
                  </p>
                </div>
              </div>
              
              <ErrorAnalyticsDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crisis" className="space-y-6">
          <CrisisAlertSystem />
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <FamilyCommunicationTools />
        </TabsContent>

        <TabsContent value="resolution" className="space-y-6">
          <ErrorResolutionTracker />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card 
        className="border-0 shadow-sm mt-8"
        style={{ 
          backgroundColor: griefSensitiveColors.peace[50],
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardHeader>
          <CardTitle style={{ color: griefSensitiveColors.peace[700] }}>
            Quick Actions for Family Support
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Immediate access to tools for helping families during technical difficulties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto p-3 lg:p-4 flex flex-col items-center gap-2"
              style={{
                borderColor: griefSensitiveColors.warning[300],
                color: griefSensitiveColors.warning[600]
              }}
              onClick={() => setActiveTab('crisis')}
            >
              <AlertTriangle className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-medium text-sm lg:text-base">Crisis Alerts</span>
              <span className="text-xs text-center">Monitor urgent family issues</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 lg:p-4 flex flex-col items-center gap-2"
              style={{
                borderColor: griefSensitiveColors.comfort[300],
                color: griefSensitiveColors.comfort[600]
              }}
              onClick={() => setActiveTab('communication')}
            >
              <MessageSquare className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-medium text-sm lg:text-base">Family Outreach</span>
              <span className="text-xs text-center">Send compassionate updates</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 lg:p-4 flex flex-col items-center gap-2"
              style={{
                borderColor: griefSensitiveColors.memory[300],
                color: griefSensitiveColors.memory[600]
              }}
              onClick={() => setActiveTab('resolution')}
            >
              <Target className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-medium text-sm lg:text-base">Resolution Tracking</span>
              <span className="text-xs text-center">Monitor healing progress</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 lg:p-4 flex flex-col items-center gap-2"
              style={{
                borderColor: griefSensitiveColors.hope[300],
                color: griefSensitiveColors.hope[600]
              }}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-medium text-sm lg:text-base">Family Analytics</span>
              <span className="text-xs text-center">Deep impact insights</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}