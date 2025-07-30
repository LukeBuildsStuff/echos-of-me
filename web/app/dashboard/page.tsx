'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RoleSelector, { UserRoleProfile } from '@/components/RoleSelector'
import MilestoneCreator from '@/components/MilestoneCreator'
import SimpleQuestionInterface from '@/components/SimpleQuestionInterface'
import MyLegacy from '@/components/MyLegacy'
import UserSettings from '@/components/UserSettings'
import UserMenu from '@/components/UserMenu'
import AppHeader from '@/components/AppHeader'
import AIEchoChat from '@/components/AIEchoChat'
import VoiceCloneInterface from '@/components/VoiceCloneInterface'
import TrainYourAI from '@/components/TrainYourAI'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { trackClick } = useAnalytics()
  const [currentView, setCurrentView] = useState<'dashboard' | 'role-setup' | 'questions' | 'milestones' | 'my-legacy' | 'settings' | 'ai-echo' | 'voice-clone' | 'train-ai'>('dashboard')
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

  // Refresh stats when user returns to dashboard
  useEffect(() => {
    const handleFocus = () => {
      if (status === 'authenticated') {
        loadUserStats()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [status])

  // Also refresh stats when the current view changes back to dashboard
  useEffect(() => {
    if (currentView === 'dashboard' && status === 'authenticated') {
      loadUserStats()
    }
  }, [currentView, status])


  const checkUserProfile = async () => {
    try {
      const response = await fetch('/api/questions/role-based')
      const data = await response.json()
      
      console.log('Profile check response:', data) // Debug log
      
      if (data.userProfile?.primaryRole) {
        setUserStats(prev => ({ ...prev, hasProfile: true }))
      } else {
        console.log('No primary role found, showing setup') // Debug log
        setCurrentView('role-setup')
      }
    } catch (error) {
      console.error('Failed to check user profile:', error)
      console.error('Error details:', error)
      setCurrentView('role-setup') // Fallback to setup on error
    }
  }

  const loadUserStats = async () => {
    try {
      const [responsesRes, milestonesRes, entriesRes] = await Promise.all([
        fetch('/api/responses'),
        fetch('/api/milestones'),
        fetch('/api/milestones?type=entries')
      ])
      
      const responsesData = await responsesRes.json()
      const milestonesData = await milestonesRes.json()
      const entriesData = await entriesRes.json()
      
      console.log('Dashboard stats data:', { responsesData, milestonesData, entriesData }) // Debug log
      
      setUserStats(prev => ({
        ...prev,
        questionsAnswered: responsesData.pagination?.total || 0,
        milestoneMessages: milestonesData.milestones?.length || 0,
        entriesCreated: entriesData.entries?.length || entriesData.total || 0
      }))
    } catch (error) {
      console.error('Failed to load user stats:', error)
    }
  }

  const handleProfileComplete = async (profile: UserRoleProfile) => {
    try {
      console.log('Saving profile:', profile) // Debug log
      
      const response = await fetch('/api/questions/role-based', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      
      const result = await response.json()
      console.log('Save response:', result) // Debug log
      
      if (response.ok) {
        setUserProfile(profile)
        setUserStats(prev => ({ ...prev, hasProfile: true }))
        setCurrentView('dashboard')
      } else {
        console.error('Failed to save profile:', result)
      }
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
      
      // If it's a life detail entry, navigate to Your Legacy section
      if (milestone.type === 'entry') {
        setCurrentView('my-legacy')
      } else {
        setCurrentView('dashboard')
      }
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
      <div className="mobile-min-vh-fix bg-background">
        <AppHeader onSettingsClick={() => setCurrentView('settings')} />
        <main className="mobile-header-spacing pb-8 safe-bottom">
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
      <div className="mobile-min-vh-fix bg-background">
        <AppHeader 
          showBackButton 
          onBack={() => setCurrentView('dashboard')}
          onSettingsClick={() => setCurrentView('settings')} 
        />
        <main className="mobile-header-spacing pb-8 safe-bottom">
          <SimpleQuestionInterface />
        </main>
      </div>
    )
  }

  // Milestone creation interface
  if (currentView === 'milestones') {
    return (
      <div className="mobile-min-vh-fix bg-background">
        <AppHeader 
          showBackButton 
          onBack={() => setCurrentView('dashboard')}
          onSettingsClick={() => setCurrentView('settings')} 
        />
        <main className="mobile-header-spacing pb-8 safe-bottom">
          <MilestoneCreator 
            onSave={handleMilestoneSave}
            onCancel={() => setCurrentView('dashboard')}
            defaultTab="diary"
          />
        </main>
      </div>
    )
  }

  // My Legacy review interface
  if (currentView === 'my-legacy') {
    return (
      <div className="mobile-min-vh-fix bg-background">
        <AppHeader 
          showBackButton 
          onBack={() => setCurrentView('dashboard')}
          onSettingsClick={() => setCurrentView('settings')} 
        />
        <main className="mobile-header-spacing pb-8 safe-bottom">
          <MyLegacy key={Date.now()} />
        </main>
      </div>
    )
  }

  // User Settings interface
  if (currentView === 'settings') {
    return (
      <div className="mobile-min-vh-fix bg-background">
        <AppHeader 
          showBackButton 
          onBack={() => setCurrentView('dashboard')}
          onSettingsClick={() => setCurrentView('settings')} 
        />
        <main className="mobile-header-spacing pb-8 safe-bottom">
          <UserSettings />
        </main>
      </div>
    )
  }

  // AI Echo Chat interface
  if (currentView === 'ai-echo') {
    return (
      <div className="mobile-min-vh-fix bg-heaven-gradient">
        <AppHeader 
          showBackButton 
          onBack={() => setCurrentView('dashboard')}
          onSettingsClick={() => setCurrentView('settings')} 
        />
        <main className="mobile-header-spacing pb-8 safe-bottom">
          <AIEchoChat userName={session?.user?.name || 'Your'} />
        </main>
      </div>
    )
  }

  // Voice Clone interface
  if (currentView === 'voice-clone') {
    return (
      <VoiceCloneInterface 
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Train Your AI interface
  if (currentView === 'train-ai') {
    return (
      <TrainYourAI 
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Main dashboard
  return (
    <div className="mobile-min-vh-fix bg-heaven-gradient">
      <AppHeader onSettingsClick={() => setCurrentView('settings')} />

      <main className="container mx-auto px-4 mobile-header-spacing pb-8 safe-bottom">
        {/* Hero Section */}
        <div className="mb-sanctuary text-center animate-fade-in">
          <div className="inline-block p-4 rounded-full bg-white/20 backdrop-blur-sm animate-float mb-4">
            <span className="text-5xl">✨</span>
          </div>
          <h2 className="text-4xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
            Preserve Your Eternal Legacy
          </h2>
          <p className="text-lg text-peace-700 max-w-2xl mx-auto font-supportive leading-relaxed">
            Create a digital echo that captures your wisdom, love, and unique voice. 
            Each question you answer becomes a gift to future generations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-embrace animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="text-center bg-white/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="pt-4 pb-4 px-3">
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-hope-600 to-hope-700 bg-clip-text text-transparent">
                {userStats.questionsAnswered}
              </div>
              <div className="text-xs md:text-sm text-peace-600 font-supportive mt-1">Memories Preserved</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="pt-4 pb-4 px-3">
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-comfort-600 to-comfort-700 bg-clip-text text-transparent">
                {userStats.milestoneMessages}
              </div>
              <div className="text-xs md:text-sm text-peace-600 font-supportive mt-1">Future Messages</div>
            </CardContent>
          </Card>
          <Card 
            className="text-center bg-white/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
            onClick={() => {
              trackClick('life_stories_counter')
              setCurrentView('milestones')
            }}
            title="Click to create a new life story"
          >
            <CardContent className="pt-4 pb-4 px-3">
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-memory-500 to-memory-600 bg-clip-text text-transparent">
                {userStats.entriesCreated}
              </div>
              <div className="text-xs md:text-sm text-peace-600 font-supportive mt-1">Life Stories</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="pt-4 pb-4 px-3">
              <div className="text-2xl md:text-3xl font-bold">
                {userStats.hasProfile ? (
                  <span className="text-green-600 animate-pulse">✓</span>
                ) : (
                  <span className="text-peace-400">○</span>
                )}
              </div>
              <div className="text-xs md:text-sm text-peace-600 font-supportive mt-1">Profile Ready</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardHeader>
              <div className="text-4xl mb-3 group-hover:animate-float">💭</div>
              <CardTitle className="text-xl font-gentle text-peace-800">
                Daily Reflections
              </CardTitle>
              <CardDescription className="text-peace-600 font-supportive">
                Answer personalized questions that capture your unique wisdom and voice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full min-h-[48px] bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive transition-all duration-300 py-3 text-sm sm:text-base" 
                onClick={() => {
                  trackClick('start_question_session')
                  setCurrentView('questions')
                }}
              >
                Begin Today&apos;s Reflection
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardHeader>
              <div className="text-4xl mb-3 group-hover:animate-float">💌</div>
              <CardTitle className="text-xl font-gentle text-peace-800">
                Future Messages
              </CardTitle>
              <CardDescription className="text-peace-600 font-supportive">
                Create messages for life&apos;s milestones - weddings, graduations, difficult times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full min-h-[48px] border-2 border-hope-400 text-hope-700 hover:bg-hope-50 rounded-embrace font-supportive transition-all duration-300 py-3 text-sm sm:text-base" 
                variant="outline"
                onClick={() => {
                  trackClick('create_milestone_message')
                  setCurrentView('milestones')
                }}
              >
                Write Future Message
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardHeader>
              <div className="text-4xl mb-3 group-hover:animate-float">👨‍👩‍👧‍👦</div>
              <CardTitle className="text-xl font-gentle text-peace-800">
                Family Profile
              </CardTitle>
              <CardDescription className="text-peace-600 font-supportive">
                {userStats.hasProfile ? 'Update your family connections' : 'Set up your role for personalized questions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full min-h-[48px] border-2 border-comfort-400 text-comfort-700 hover:bg-comfort-50 rounded-embrace font-supportive transition-all duration-300 py-3 text-sm sm:text-base" 
                variant="outline"
                onClick={() => {
                  trackClick(userStats.hasProfile ? 'update_profile' : 'setup_profile')
                  setCurrentView('role-setup')
                }}
              >
                {userStats.hasProfile ? 'Update Profile' : 'Set Up Profile'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardHeader>
              <div className="text-4xl mb-3 group-hover:animate-float">📖</div>
              <CardTitle className="text-xl font-gentle text-peace-800">
                Your Legacy
              </CardTitle>
              <CardDescription className="text-peace-600 font-supportive">
                Review and refine your preserved memories and wisdom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full min-h-[48px] border-2 border-memory-400 text-memory-700 hover:bg-memory-50 rounded-embrace font-supportive transition-all duration-300 py-3 text-sm sm:text-base" 
                variant="outline"
                onClick={() => setCurrentView('my-legacy')}
              >
                View Your Legacy
              </Button>
            </CardContent>
          </Card>


          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardHeader>
              <div className="text-4xl mb-3 group-hover:animate-float">🤖</div>
              <CardTitle className="text-xl font-gentle text-peace-800">
                Your Echo
              </CardTitle>
              <CardDescription className="text-peace-600 font-supportive">
                Chat with your digital echo trained on your responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full min-h-[48px] border-2 border-hope-400 text-hope-700 hover:bg-hope-50 rounded-embrace font-supportive transition-all duration-300 py-3 text-sm sm:text-base" 
                variant="outline"
                onClick={() => setCurrentView('ai-echo')}
              >
                Chat with Your Echo
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardHeader>
              <div className="text-4xl mb-3 group-hover:animate-float">🧠</div>
              <CardTitle className="text-xl font-gentle text-peace-800">
                Train Your AI
              </CardTitle>
              <CardDescription className="text-peace-600 font-supportive">
                Create a personalized AI that speaks with your authentic voice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full min-h-[48px] bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive transition-all duration-300 py-3 text-sm sm:text-base" 
                onClick={() => {
                  trackClick('start_ai_training')
                  setCurrentView('train-ai')
                }}
              >
                Train Your AI
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Legacy Mission Reminder */}
        <div className="mt-sanctuary bg-white/60 backdrop-blur-md rounded-sanctuary p-sanctuary shadow-2xl animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 animate-glow">
              <span className="text-4xl">💙</span>
            </div>
            <h3 className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
              Your Mission
            </h3>
            <p className="text-lg text-peace-700 max-w-3xl mx-auto font-supportive leading-relaxed">
              Every question you answer, every story you share, and every message you create 
              becomes part of an irreplaceable digital legacy. You&apos;re not just preserving memories - 
              you&apos;re gifting your love, wisdom, and unique voice to future generations.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}