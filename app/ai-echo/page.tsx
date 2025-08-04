'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import ComprehensiveAIEchoInterface from '@/components/ComprehensiveAIEchoInterface'
import ErrorBoundary from '@/components/ErrorBoundary'
import { LoadingSpinner } from '@/components/ui/loading'

interface FamilyMember {
  id: string
  name: string
  relationship: string
  avatar?: string
  traits?: string[]
  significance?: string
  memories?: string[]
  voiceCloned?: boolean
  lastInteraction?: Date
  lifeSpan?: {
    birth?: string
    passing?: string
  }
  favoriteMemories?: string[]
  wisdomThemes?: string[]
  personalityTraits?: {
    warmth: number
    humor: number
    wisdom: number
    strength: number
  }
}

export default function AIEchoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [familyMember, setFamilyMember] = useState<FamilyMember | undefined>()
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Parse URL parameters for family member context
  useEffect(() => {
    const memberId = searchParams.get('member')
    const name = searchParams.get('name')
    const relationship = searchParams.get('relationship')
    const traits = searchParams.get('traits')
    const significance = searchParams.get('significance')
    const memories = searchParams.get('memories')
    const demo = searchParams.get('demo') === 'true'
    
    setIsDemo(demo)
    
    if (name && relationship) {
      const member: FamilyMember = {
        id: memberId || `member_${Date.now()}`,
        name,
        relationship,
        traits: traits ? traits.split(',').map(t => t.trim()) : undefined,
        significance: significance || undefined,
        memories: memories ? memories.split(',').map(m => m.trim()) : undefined,
        voiceCloned: searchParams.get('voice') === 'true',
        wisdomThemes: traits ? traits.split(',').map(t => t.trim()) : ['Love', 'Wisdom', 'Family'],
        personalityTraits: {
          warmth: 0.9,
          humor: 0.7,
          wisdom: 0.8,
          strength: 0.8
        }
      }
      
      setFamilyMember(member)
    }
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <div className="text-lg text-peace-700 font-supportive">
            {familyMember 
              ? `Connecting with ${familyMember.name}'s AI echo...`
              : 'Loading your AI echo...'
            }
          </div>
          <div className="text-sm text-peace-600 mt-2">
            Preparing a sacred space for connection
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-heaven-gradient">
        <ComprehensiveAIEchoInterface
          familyMember={familyMember}
          isDemo={isDemo}
          onClose={() => router.push('/dashboard')}
          initialMode="chat"
        />
      </div>
    </ErrorBoundary>
  )
}

// Example usage patterns:
// /ai-echo - Regular user's own echo
// /ai-echo?member=123&name=Grandma&relationship=grandmother&traits=wise,caring,funny
// /ai-echo?name=Dad&relationship=father&memories=fishing trips,bedtime stories