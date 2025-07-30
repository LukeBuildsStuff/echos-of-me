'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-peace-50 to-comfort-50">
      <Card className="w-full max-w-lg mx-auto shadow-lg border border-peace-200">
        <CardHeader className="text-center pb-4">
          <div className="text-6xl mb-4">😔</div>
          <CardTitle className="text-2xl font-gentle text-peace-800 mb-2">
            Something Interrupted Your Journey
          </CardTitle>
          <p className="text-comfort text-peace-600 leading-relaxed">
            We encountered an unexpected issue while you were preserving your memories. 
            Don&apos;t worry - your precious responses are safe and we&apos;ll help you continue.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Development Error Details */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-warning-50 border border-warning-200 rounded-embrace p-4">
              <h4 className="font-gentle text-warning-800 mb-2">Error Details (Development):</h4>
              <div className="text-sm text-warning-700 bg-white rounded p-2 overflow-auto">
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                {error.digest && (
                  <div className="mb-2">
                    <strong>Digest:</strong> {error.digest}
                  </div>
                )}
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1 text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reassuring Information */}
          <div className="bg-gradient-to-r from-hope-50 to-comfort-50 rounded-embrace p-4 border border-hope-200">
            <h4 className="font-gentle text-hope-800 mb-3">Your Memories Are Safe:</h4>
            <ul className="space-y-2 text-comfort text-hope-700">
              <li className="flex items-start gap-2">
                <span className="text-hope-500 mt-1">💾</span>
                <span>All your responses have been automatically saved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-hope-500 mt-1">🔒</span>
                <span>Your personal information remains secure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-hope-500 mt-1">🔄</span>
                <span>You can resume exactly where you left off</span>
              </li>
            </ul>
          </div>

          {/* Recovery Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={reset}
              className="flex-1 bg-hope-500 hover:bg-hope-600 text-white"
            >
              Continue My Journey
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="flex-1 border-peace-300 text-peace-700 hover:bg-peace-50"
            >
              Return to Dashboard
            </Button>
          </div>

          {/* Support Information */}
          <div className="text-center p-4 bg-comfort-50 rounded-embrace border border-comfort-200">
            <p className="text-comfort text-comfort-600 mb-1">
              💜 Having trouble? We&apos;re here to help
            </p>
            <p className="text-whisper text-comfort-500">
              Your legacy journey matters to us - let&apos;s resolve this together
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}