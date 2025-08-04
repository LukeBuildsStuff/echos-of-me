'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import AppHeader from '@/components/AppHeader'
import SimpleTrainingManager from '@/components/SimpleTrainingManager'

export default function AdminTrainingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      if (response.ok) {
        setLoading(false)
      }
    } catch (error) {
      console.error('Admin access check failed:', error)
      router.push('/dashboard')
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkAdminAccess()
    }
  }, [status, router, checkAdminAccess])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading admin training dashboard...</div>
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
        onBack={() => router.push('/admin')}
      />
      
      <main className="container mx-auto px-4 pt-32 pb-8">
        <SimpleTrainingManager />
      </main>
    </div>
  )
}