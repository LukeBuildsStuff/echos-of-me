'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') {
      // Still loading, wait
      return
    }
    
    if (status === 'authenticated') {
      // User is logged in, redirect to dashboard
      router.push('/dashboard')
    } else {
      // User is not logged in, redirect to signin
      router.push('/auth/signin')
    }
  }, [status, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-heaven-gradient flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block p-4 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 animate-pulse">
          <span className="text-4xl">💙</span>
        </div>
        <h1 className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
          Echos Of Me
        </h1>
        <p className="text-peace-600 font-supportive mt-2">
          Redirecting you to your legacy...
        </p>
      </div>
    </div>
  )
}