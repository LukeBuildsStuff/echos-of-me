'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AppHeader from '@/components/AppHeader'

interface TrainingStatus {
  currentStatus: {
    isReady: boolean
    nextTraining: string | null
    lastTraining: any
  }
  progress: {
    responses: { current: number; required: number; percentage: number }
    categories: { current: number; required: number; percentage: number }
    words: { current: number; required: number; percentage: number }
  }
  schedule: {
    frequency: string
    dayOfWeek: string
    timeUTC: string
  }
  trainingHistory: any[]
}

export default function AdminTrainingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggeringTraining, setTriggeringTraining] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkAdminAccess()
    }
  }, [status, router])

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      if (response.ok) {
        await loadTrainingStatus()
      }
    } catch (error) {
      console.error('Admin access check failed:', error)
      router.push('/dashboard')
    }
  }

  const loadTrainingStatus = async () => {
    try {
      const response = await fetch('/api/training/schedule')
      if (response.ok) {
        const data = await response.json()
        setTrainingStatus(data)
      }
    } catch (error) {
      console.error('Failed to load training status:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerTraining = async () => {
    setTriggeringTraining(true)
    try {
      const response = await fetch('/api/training/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger_training',
          userId: null // All users for admin
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        alert(`Training started! Estimated completion: ${new Date(data.estimatedCompletion).toLocaleString()}`)
        await loadTrainingStatus()
      } else {
        alert(`Training failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to trigger training:', error)
      alert('Failed to trigger training')
    } finally {
      setTriggeringTraining(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading training dashboard...</div>
      </div>
    )
  }

  if (!session || !trainingStatus) {
    return null
  }

  return (
    <div className="min-h-screen bg-heaven-gradient">
      <AppHeader 
        showBackButton 
        onBack={() => router.push('/admin')}
      />
      
      <main className="container mx-auto px-4 pt-32 pb-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
            AI Training Management
          </h1>
          <p className="text-peace-700 font-supportive">
            Monitor and manage the weekly AI model training pipeline
          </p>
        </div>

        {/* Training Status */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Training Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Responses</span>
                  <span>{trainingStatus.progress.responses.current}/{trainingStatus.progress.responses.required}</span>
                </div>
                <div className="w-full bg-peace-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-hope-400 to-comfort-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${trainingStatus.progress.responses.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Categories</span>
                  <span>{trainingStatus.progress.categories.current}/{trainingStatus.progress.categories.required}</span>
                </div>
                <div className="w-full bg-peace-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-comfort-400 to-memory-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${trainingStatus.progress.categories.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Words</span>
                  <span>{trainingStatus.progress.words.current.toLocaleString()}/{trainingStatus.progress.words.required.toLocaleString()}</span>
                </div>
                <div className="w-full bg-peace-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-memory-400 to-hope-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${trainingStatus.progress.words.percentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🕒 Training Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-peace-600">Frequency:</span>
                  <Badge variant="outline">{trainingStatus.schedule.frequency}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-peace-600">Day:</span>
                  <span className="font-medium">{trainingStatus.schedule.dayOfWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-peace-600">Time:</span>
                  <span className="font-medium">{trainingStatus.schedule.timeUTC}</span>
                </div>
                {trainingStatus.currentStatus.nextTraining && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-peace-600">Next Training:</span>
                    <p className="font-medium text-hope-700">
                      {new Date(trainingStatus.currentStatus.nextTraining).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={triggerTraining}
                disabled={!trainingStatus.currentStatus.isReady || triggeringTraining}
                className="w-full bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
              >
                {triggeringTraining ? 'Starting...' : 'Trigger Training Now'}
              </Button>
              
              {!trainingStatus.currentStatus.isReady && (
                <p className="text-sm text-peace-600 text-center">
                  Need more data before training can begin
                </p>
              )}

              <Button
                variant="outline"
                onClick={() => router.push('/api/training/prepare-data')}
                className="w-full"
              >
                View Training Data
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Training History */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Training History</CardTitle>
            <CardDescription>Recent model training runs and their results</CardDescription>
          </CardHeader>
          <CardContent>
            {trainingStatus.trainingHistory.length > 0 ? (
              <div className="space-y-4">
                {trainingStatus.trainingHistory.map((run, index) => (
                  <div key={run.id || index} className="flex items-center justify-between p-4 bg-peace-50 rounded-embrace">
                    <div>
                      <div className="font-medium">
                        Model v{run.model_version} - {run.user_name || 'System'}
                      </div>
                      <div className="text-sm text-peace-600">
                        {run.training_examples_count} examples • Started {new Date(run.started_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {run.status}
                      </Badge>
                      {run.final_loss && (
                        <div className="text-sm text-peace-600 mt-1">
                          Loss: {run.final_loss}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-peace-600">
                No training runs yet. The first training will begin once sufficient data is collected.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}