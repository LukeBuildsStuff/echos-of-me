'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserCheck, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Activity, 
  Brain,
  Target,
  BarChart3,
  Zap
} from 'lucide-react'

interface MetricsData {
  user_metrics: {
    total_users: number
    new_users_today: number
    new_users_week: number
    daily_active_users: number
    weekly_active_users: number
    monthly_active_users: number
    user_growth_rate: string
  }
  engagement_metrics: {
    total_responses: number
    responses_today: number
    responses_week: number
    total_responders: number
    responders_today: number
    avg_response_length: number
    response_growth_rate: number
    completion_rate: string
  }
  training_metrics: {
    total_training_jobs: number
    active_jobs: number
    completed_jobs: number
    success_rate: number
    eligible_users: number
    jobs_today: number
  }
  retention_metrics: {
    weekly_retention_rate: number
    monthly_retention_rate: number
  }
}

interface MetricsCardsProps {
  data: MetricsData | null
  loading: boolean
}

export default function MetricsCards({ data, loading }: MetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="border border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Failed to load metrics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getGrowthIcon = (rate: number) => {
    if (rate > 0) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (rate < 0) return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Activity className="h-3 w-3 text-gray-500" />
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Users */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <Users className="h-4 w-4 text-blue-600" />
            Total Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatNumber(data.user_metrics.total_users)}
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            {getGrowthIcon(parseFloat(data.user_metrics.user_growth_rate))}
            {data.user_metrics.new_users_today} new today
          </p>
          <div className="mt-2 text-xs text-gray-500">
            {data.user_metrics.new_users_week} this week
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <UserCheck className="h-4 w-4 text-green-600" />
            Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatNumber(data.user_metrics.daily_active_users)}
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            Today
          </p>
          <div className="mt-2 text-xs text-gray-500">
            {formatNumber(data.user_metrics.weekly_active_users)} weekly / {formatNumber(data.user_metrics.monthly_active_users)} monthly
          </div>
        </CardContent>
      </Card>

      {/* Response Activity */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <MessageCircle className="h-4 w-4 text-purple-600" />
            Responses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatNumber(data.engagement_metrics.total_responses)}
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Activity className="h-3 w-3 text-purple-500" />
            {data.engagement_metrics.responses_today} today
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Avg length: {data.engagement_metrics.avg_response_length} chars
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <Target className="h-4 w-4 text-green-600" />
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold mb-1 ${getHealthColor(parseFloat(data.engagement_metrics.completion_rate))}`}>
            {data.engagement_metrics.completion_rate}%
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <BarChart3 className="h-3 w-3 text-green-500" />
            Response quality
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {data.engagement_metrics.responders_today} active responders
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Training System */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <Brain className="h-4 w-4 text-indigo-600" />
            Training System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {data.training_metrics.active_jobs}
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Zap className="h-3 w-3 text-indigo-500" />
            Active jobs
          </p>
          <div className="mt-2 text-xs text-gray-500">
            {data.training_metrics.jobs_today} started today
          </div>
        </CardContent>
      </Card>

      {/* Training Success Rate */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Training Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold mb-1 ${getHealthColor(data.training_metrics.success_rate)}`}>
            {data.training_metrics.success_rate.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            Success rate
          </p>
          <div className="mt-2 text-xs text-gray-500">
            {data.training_metrics.completed_jobs} completed
          </div>
        </CardContent>
      </Card>

      {/* Eligible Users */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <Users className="h-4 w-4 text-orange-600" />
            Training Ready
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {data.training_metrics.eligible_users}
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Brain className="h-3 w-3 text-orange-500" />
            Eligible users
          </p>
          <div className="mt-2 text-xs text-gray-500">
            50+ responses required
          </div>
        </CardContent>
      </Card>

      {/* User Retention */}
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <Clock className="h-4 w-4 text-blue-600" />
            Retention Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold mb-1 ${getHealthColor(data.retention_metrics.weekly_retention_rate)}`}>
            {data.retention_metrics.weekly_retention_rate.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            Weekly retention
          </p>
          <div className="mt-2 text-xs text-gray-500">
            {data.retention_metrics.monthly_retention_rate.toFixed(0)}% monthly
          </div>
        </CardContent>
      </Card>
    </div>
  )
}