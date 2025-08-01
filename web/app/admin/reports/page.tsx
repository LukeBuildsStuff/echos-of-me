'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AdminLayout from '@/components/AdminLayout'
import { SimpleChart } from '@/components/admin/DashboardWidgets'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Brain, 
  MessageSquare, 
  Download,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  DollarSign,
  Clock,
  Target,
  Award,
  Zap,
  Eye,
  Share2
} from 'lucide-react'

interface ReportMetrics {
  users: {
    total: number
    active: number
    newThisMonth: number
    retention: number
    churnRate: number
    engagementScore: number
  }
  training: {
    totalJobs: number
    completedJobs: number
    avgTrainingTime: number
    successRate: number
    queueLength: number
    gpuUtilization: number
  }
  responses: {
    total: number
    dailyAverage: number
    avgLength: number
    qualityScore: number
    moderationFlags: number
  }
  system: {
    uptime: number
    avgResponseTime: number
    errorRate: number
    storageUsed: number
    bandwidthUsed: number
  }
  business: {
    revenue: number
    conversions: number
    churn: number
    mrr: number
    ltv: number
  }
}

interface ChartData {
  label: string
  value: number
  category?: string
}

const mockMetrics: ReportMetrics = {
  users: {
    total: 1247,
    active: 934,
    newThisMonth: 156,
    retention: 78.5,
    churnRate: 3.2,
    engagementScore: 8.4
  },
  training: {
    totalJobs: 2341,
    completedJobs: 2298,
    avgTrainingTime: 1840,
    successRate: 98.2,
    queueLength: 12,
    gpuUtilization: 76.3
  },
  responses: {
    total: 45678,
    dailyAverage: 1523,
    avgLength: 287,
    qualityScore: 9.1,
    moderationFlags: 23
  },
  system: {
    uptime: 99.8,
    avgResponseTime: 342,
    errorRate: 0.12,
    storageUsed: 2.3,
    bandwidthUsed: 1.8
  },
  business: {
    revenue: 47890,
    conversions: 156,
    churn: 23,
    mrr: 15650,
    ltv: 485
  }
}

const generateChartData = (days: number = 30): ChartData[] => {
  return Array.from({ length: days }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: Math.floor(Math.random() * 100) + 50
  }))
}

export default function AdminReports() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<ReportMetrics>(mockMetrics)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'training' | 'content' | 'business'>('overview')
  const [dateRange, setDateRange] = useState('30d')
  const [reportType, setReportType] = useState('summary')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      // Load report data
      const reportsResponse = await fetch(`/api/admin/reports?range=${dateRange}&type=${reportType}`)
      if (reportsResponse.ok) {
        const data = await reportsResponse.json()
        setMetrics(data.metrics || mockMetrics)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setLoading(false)
    }
  }, [router, dateRange, reportType])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkAdminAccess()
    }
  }, [status, router, checkAdminAccess])

  const exportReport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const response = await fetch('/api/admin/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          dateRange,
          reportType,
          customStartDate,
          customEndDate
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `admin-report-${dateRange}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const scheduleReport = async () => {
    try {
      const response = await fetch('/api/admin/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: 'weekly',
          reportType,
          recipients: [session?.user?.email]
        })
      })

      if (response.ok) {
        alert('Report scheduled successfully!')
      }
    } catch (error) {
      console.error('Failed to schedule report:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <ErrorBoundary>
      <AdminLayout
        title="Reports & Analytics"
        subtitle="Comprehensive reporting and business intelligence dashboard"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Reports' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkAdminAccess()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scheduleReport}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('pdf')}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('csv')}
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('excel')}
              >
                Excel
              </Button>
            </div>
          </div>
        }
      >
        {/* Report Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="dateRange">Date Range:</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="startDate">From:</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="endDate">To:</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Label htmlFor="reportType">Report Type:</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Executive Summary</SelectItem>
                    <SelectItem value="detailed">Detailed Analysis</SelectItem>
                    <SelectItem value="performance">Performance Report</SelectItem>
                    <SelectItem value="financial">Financial Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Training
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Business
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <div className="text-2xl font-bold">{metrics.users.total.toLocaleString()}</div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>+{metrics.users.newThisMonth} this month</span>
                      </div>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Training Jobs</p>
                      <div className="text-2xl font-bold">{metrics.training.totalJobs.toLocaleString()}</div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Target className="h-3 w-3" />
                        <span>{metrics.training.successRate}% success rate</span>
                      </div>
                    </div>
                    <Brain className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Responses</p>
                      <div className="text-2xl font-bold">{metrics.responses.total.toLocaleString()}</div>
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <Activity className="h-3 w-3" />
                        <span>{metrics.responses.dailyAverage}/day avg</span>
                      </div>
                    </div>
                    <MessageSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">System Uptime</p>
                      <div className="text-2xl font-bold">{metrics.system.uptime}%</div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Award className="h-3 w-3" />
                        <span>{metrics.system.avgResponseTime}ms avg response</span>
                      </div>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overview Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <SimpleChart
                title="User Growth Trend"
                data={generateChartData(30)}
                type="line"
              />
              
              <SimpleChart
                title="Training Jobs by Day"
                data={generateChartData(30)}
                type="bar"
              />
              
              <SimpleChart
                title="Response Volume"
                data={generateChartData(30)}
                type="line"
              />
              
              <SimpleChart
                title="System Performance"
                data={[
                  { label: 'CPU Usage', value: 34 },
                  { label: 'Memory Usage', value: 67 },
                  { label: 'Disk Usage', value: 23 },
                  { label: 'Network Usage', value: 45 }
                ]}
                type="bar"
              />
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics.users.active}</div>
                  <p className="text-sm text-gray-500 mt-1">{((metrics.users.active / metrics.users.total) * 100).toFixed(1)}% of total</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Retention Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{metrics.users.retention}%</div>
                  <p className="text-sm text-gray-500 mt-1">30-day retention</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Engagement Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{metrics.users.engagementScore}/10</div>
                  <p className="text-sm text-gray-500 mt-1">Average user engagement</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <SimpleChart
                title="New User Registrations"
                data={generateChartData(30)}
                type="bar"
              />
              
              <SimpleChart
                title="User Activity by Plan"
                data={[
                  { label: 'Free', value: 756 },
                  { label: 'Premium', value: 324 },
                  { label: 'Enterprise', value: 167 }
                ]}
                type="bar"
              />
              
              <SimpleChart
                title="User Retention Cohort"
                data={generateChartData(12)}
                type="line"
              />
              
              <SimpleChart
                title="Geographic Distribution"
                data={[
                  { label: 'North America', value: 45 },
                  { label: 'Europe', value: 30 },
                  { label: 'Asia', value: 20 },
                  { label: 'Other', value: 5 }
                ]}
                type="bar"
              />
            </div>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <div className="text-2xl font-bold text-green-600">{metrics.training.successRate}%</div>
                    </div>
                    <Award className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Training Time</p>
                      <div className="text-2xl font-bold">{Math.floor(metrics.training.avgTrainingTime / 60)}m</div>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Queue Length</p>
                      <div className="text-2xl font-bold">{metrics.training.queueLength}</div>
                    </div>
                    <Activity className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">GPU Utilization</p>
                      <div className="text-2xl font-bold">{metrics.training.gpuUtilization}%</div>
                    </div>
                    <Zap className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <SimpleChart
                title="Training Jobs Over Time"
                data={generateChartData(30)}
                type="line"
              />
              
              <SimpleChart
                title="Training Success vs Failures"
                data={[
                  { label: 'Successful', value: metrics.training.completedJobs },
                  { label: 'Failed', value: metrics.training.totalJobs - metrics.training.completedJobs }
                ]}
                type="bar"
              />
              
              <SimpleChart
                title="GPU Utilization Over Time"
                data={generateChartData(24)}
                type="line"
              />
              
              <SimpleChart
                title="Training Duration Distribution"
                data={[
                  { label: '< 30min', value: 234 },
                  { label: '30-60min', value: 567 },
                  { label: '1-2hr', value: 345 },
                  { label: '> 2hr', value: 123 }
                ]}
                type="bar"
              />
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Quality Score</p>
                      <div className="text-2xl font-bold text-green-600">{metrics.responses.qualityScore}/10</div>
                    </div>
                    <Award className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Response Length</p>
                      <div className="text-2xl font-bold">{metrics.responses.avgLength}</div>
                      <p className="text-xs text-gray-500">characters</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Daily Average</p>
                      <div className="text-2xl font-bold">{metrics.responses.dailyAverage.toLocaleString()}</div>
                      <p className="text-xs text-gray-500">responses/day</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600">Moderation Flags</p>
                      <div className="text-2xl font-bold text-yellow-700">{metrics.responses.moderationFlags}</div>
                    </div>
                    <Eye className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <SimpleChart
                title="Response Volume by Day"
                data={generateChartData(30)}
                type="bar"
              />
              
              <SimpleChart
                title="Content Quality Trends"
                data={generateChartData(30)}
                type="line"
              />
              
              <SimpleChart
                title="Response Length Distribution"
                data={[
                  { label: '< 100 chars', value: 1234 },
                  { label: '100-300 chars', value: 2345 },
                  { label: '300-500 chars', value: 1567 },
                  { label: '> 500 chars', value: 532 }
                ]}
                type="bar"
              />
              
              <SimpleChart
                title="Content Categories"
                data={[
                  { label: 'Personal Stories', value: 35 },
                  { label: 'Family History', value: 28 },
                  { label: 'Life Lessons', value: 22 },
                  { label: 'Memories', value: 15 }
                ]}
                type="bar"
              />
            </div>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Revenue</p>
                      <div className="text-2xl font-bold text-green-600">${metrics.business.revenue.toLocaleString()}</div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">MRR</p>
                      <div className="text-2xl font-bold">${metrics.business.mrr.toLocaleString()}</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Conversions</p>
                      <div className="text-2xl font-bold">{metrics.business.conversions}</div>
                    </div>
                    <Target className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Customer LTV</p>
                      <div className="text-2xl font-bold">${metrics.business.ltv}</div>
                    </div>
                    <Award className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Churn Rate</p>
                      <div className="text-2xl font-bold text-red-700">{metrics.business.churn}</div>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <SimpleChart
                title="Revenue Growth"
                data={generateChartData(12)}
                type="line"
              />
              
              <SimpleChart
                title="Subscription Distribution"
                data={[
                  { label: 'Free', value: 756 },
                  { label: 'Premium', value: 324 },
                  { label: 'Enterprise', value: 167 }
                ]}
                type="bar"
              />
              
              <SimpleChart
                title="Conversion Funnel"
                data={[
                  { label: 'Visitors', value: 10000 },
                  { label: 'Signups', value: 2500 },
                  { label: 'Trials', value: 500 },
                  { label: 'Conversions', value: 156 }
                ]}
                type="bar"
              />
              
              <SimpleChart
                title="Customer Lifetime Value"
                data={generateChartData(12)}
                type="line"
              />
            </div>
          </TabsContent>
        </Tabs>
      </AdminLayout>
    </ErrorBoundary>
  )
}