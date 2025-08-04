'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <Card className="w-full max-w-lg mx-auto shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="text-6xl mb-4">💔</div>
              <CardTitle className="text-2xl font-semibold text-gray-800 mb-2">
                Something Went Very Wrong
              </CardTitle>
              <p className="text-gray-600 leading-relaxed">
                We&apos;re deeply sorry - a critical error occurred while preserving your precious memories. 
                Please know that your legacy data is safe and we&apos;re committed to resolving this.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Information */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Error Details (Development):</h4>
                  <div className="text-sm text-red-700 bg-white rounded p-2 overflow-auto">
                    <div className="mb-2">
                      <strong>Message:</strong> {error.message}
                    </div>
                    {error.digest && (
                      <div className="mb-2">
                        <strong>Digest:</strong> {error.digest}
                      </div>
                    )}
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">
                        {error.stack}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Recovery Actions */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3">Emergency Recovery Options:</h4>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Your memories and responses are backed up safely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Try reloading the entire application</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Clear your browser cache if problems persist</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={reset}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Try to Recover
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reload Application
                </Button>
              </div>

              {/* Emergency Contact */}
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-purple-700 mb-2 font-medium">
                  🆘 Critical Error - We&apos;re Here to Help
                </p>
                <p className="text-sm text-purple-600">
                  Your legacy is irreplaceable. Please contact our emergency support immediately 
                  if this error persists. We take your family&apos;s memories seriously.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}