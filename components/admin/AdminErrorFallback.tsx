'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdminErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function AdminErrorFallback({ error, resetErrorBoundary }: AdminErrorFallbackProps) {
  const router = useRouter()

  useEffect(() => {
    // Log error to monitoring service
    console.error('Admin Portal Error:', error)
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        error_name: error.name,
        page_location: window.location.pathname
      })
    }
  }, [error])

  const handleGoHome = () => {
    router.push('/admin')
    resetErrorBoundary()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Admin Portal Error</CardTitle>
          <CardDescription>
            Something went wrong while loading this admin page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600 font-mono break-all">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={resetErrorBoundary}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            If this error persists, please contact support
          </p>
        </CardContent>
      </Card>
    </div>
  )
}