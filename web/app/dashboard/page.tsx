'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RoleSelector, { UserRoleProfile } from '@/components/RoleSelector'
import MilestoneCreator from '@/components/MilestoneCreator'
import EnhancedQuestionInterface from '@/components/EnhancedQuestionInterface'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<'dashboard' | 'role-setup' | 'questions' | 'milestones'>('dashboard')
  const [userProfile, setUserProfile] = useState<UserRoleProfile | null>(null)
  const [userStats, setUserStats] = useState({
    questionsAnswered: 0,
    milestoneMessages: 0,
    entriesCreated: 0,
    hasProfile: false
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkUserProfile()
      loadUserStats()
    }
  }, [status, router])

  const checkUserProfile = async () => {
    try {
      const response = await fetch('/api/questions/role-based')
      const data = await response.json()
      if (data.userProfile?.primaryRole) {
        setUserStats(prev => ({ ...prev, hasProfile: true }))
      } else {
        setCurrentView('role-setup')
      }
    } catch (error) {
      console.error('Failed to check user profile:', error)
    }
  }

  const loadUserStats = async () => {
    try {
      const [responsesRes, milestonesRes] = await Promise.all([
        fetch('/api/responses'),
        fetch('/api/milestones')
      ])
      
      const responsesData = await responsesRes.json()
      const milestonesData = await milestonesRes.json()
      
      setUserStats(prev => ({
        ...prev,
        questionsAnswered: responsesData.total || 0,
        milestoneMessages: milestonesData.milestones?.length || 0,
        entriesCreated: milestonesData.entries?.length || 0
      }))
    } catch (error) {
      console.error('Failed to load user stats:', error)
    }
  }

  const handleProfileComplete = async (profile: UserRoleProfile) => {
    try {
      await fetch('/api/questions/role-based', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      setUserProfile(profile)
      setUserStats(prev => ({ ...prev, hasProfile: true }))
      setCurrentView('dashboard')
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleMilestoneSave = async (milestone: any) => {
    try {
      await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestone)
      })
      loadUserStats()
      setCurrentView('dashboard')
    } catch (error) {
      console.error('Failed to save milestone:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Role setup flow for new users
  if (currentView === 'role-setup') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Echos Of Me</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {session.user?.name}
              </span>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <main className="py-8">
          <RoleSelector 
            onComplete={handleProfileComplete}
            onCancel={() => setCurrentView('dashboard')}
          />
        </main>
      </div>
    )
  }

  // Enhanced questions interface
  if (currentView === 'questions') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Echos Of Me</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setCurrentView('dashboard')}>
                ← Back to Dashboard
              </Button>
              <span className="text-sm text-muted-foreground">
                {session.user?.name}
              </span>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <main className="py-8">
          <EnhancedQuestionInterface />
        </main>
      </div>
    )
  }

  // Milestone creation interface
  if (currentView === 'milestones') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Echos Of Me</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setCurrentView('dashboard')}>
                ← Back to Dashboard
              </Button>
              <span className="text-sm text-muted-foreground">
                {session.user?.name}
              </span>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <main className="py-8">
          <MilestoneCreator 
            onSave={handleMilestoneSave}
            onCancel={() => setCurrentView('dashboard')}
          />
        </main>
      </div>
    )
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Echos Of Me</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {session.user?.name}
            </span>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Preserve Your Legacy</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create an AI echo that captures your wisdom, love, and unique voice for future generations. 
            Answer personalized questions to build a digital legacy that truly sounds like you.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{userStats.questionsAnswered}</div>
              <div className="text-sm text-gray-600">Questions Answered</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{userStats.milestoneMessages}</div>
              <div className="text-sm text-gray-600">Milestone Messages</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{userStats.entriesCreated}</div>
              <div className="text-sm text-gray-600">Life Entries</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {userStats.hasProfile ? '✓' : '○'}
              </div>
              <div className="text-sm text-gray-600">Profile Setup</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 AI-Enhanced Questions
              </CardTitle>
              <CardDescription>
                Answer personalized questions that adapt to your responses and capture your unique voice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => setCurrentView('questions')}
              >
                Start Question Session
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💌 Milestone Messages
              </CardTitle>
              <CardDescription>
                Create messages for future life events - weddings, graduations, difficult times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setCurrentView('milestones')}
              >
                Create Milestone Message
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 Family Profile
              </CardTitle>
              <CardDescription>
                {userStats.hasProfile ? 'Update your family role and relationship details' : 'Set up your family role to get personalized questions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setCurrentView('role-setup')}
              >
                {userStats.hasProfile ? 'Update Profile' : 'Set Up Profile'}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📖 Life Journal
              </CardTitle>
              <CardDescription>
                Browse your milestone messages and life detail entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                View Journal (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🤖 Your AI Echo
              </CardTitle>
              <CardDescription>
                Test and interact with your trained legacy AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Chat with Echo (Training)
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Legacy Insights
              </CardTitle>
              <CardDescription>
                View emotional patterns and themes in your responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                View Insights (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Legacy Mission Reminder */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">💙 Your Sacred Mission</h3>
            <p className="text-gray-700 max-w-3xl mx-auto">
              Every question you answer, every story you share, and every message you create 
              becomes part of an irreplaceable digital legacy. You're not just training an AI - 
              you're preserving your love, wisdom, and unique voice for the people who matter most.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}