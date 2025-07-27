'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AIEchoChat from '@/components/AIEchoChat'
import AppHeader from '@/components/AppHeader'

export default function AIEchoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heaven-gradient">
        <div className="text-lg text-peace-700 font-supportive">Loading your AI echo...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-heaven-gradient">
      <AppHeader 
        showBackButton 
        onBack={() => router.push('/dashboard')}
      />
      <AIEchoChat userName={session.user?.name || 'Your'} />
    </div>
  )
}