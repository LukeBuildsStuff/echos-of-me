'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Shield, Home } from 'lucide-react'

interface AdminErrorHandlerProps {
  error: {
    status?: number
    message?: string
    code?: string
  }
  onRetry?: () => void
  onGoHome?: () => void
  title?: string
}

export default function AdminErrorHandler({ 
  error, 
  onRetry, 
  onGoHome,
  title = "Something went wrong"
}: AdminErrorHandlerProps) {
  
  const getErrorDetails = () => {
    switch (error.status) {
      case 401:
        return {
          icon: Shield,
          title: "Authentication Required",
          description: "Your session has expired or you're not logged in.",
          suggestions: [
            "Please sign in to access admin features",
            "Check if your session is still valid",
            "Contact support if the issue persists"
          ],
          actionText: "Sign In",
          actionColor: "default" as const
        }
        
      case 403:
        return {
          icon: Shield,
          title: "Access Denied",
          description: "You don't have permission to access this admin feature.",
          suggestions: [
            "Contact your administrator to request admin access",
            "Verify your account has admin privileges",
            "Try accessing a different admin section"
          ],
          actionText: "Go to Dashboard",
          actionColor: "default" as const
        }
        
      case 404:
        return {
          icon: AlertTriangle,
          title: "Resource Not Found",
          description: "The requested admin resource or page doesn't exist.",
          suggestions: [
            "Check the URL for typos",
            "The resource may have been moved or deleted",
            "Return to the main admin dashboard"
          ],
          actionText: "Admin Dashboard",
          actionColor: "default" as const
        }
        
      case 500:
        return {
          icon: AlertTriangle,
          title: "Server Error",
          description: "An internal server error occurred while processing your request.",
          suggestions: [
            "Try refreshing the page",
            "Wait a few moments and try again",
            "Contact support if the error persists"
          ],
          actionText: "Try Again",
          actionColor: "destructive" as const
        }
        
      case 503:
        return {
          icon: AlertTriangle,
          title: "Service Unavailable",
          description: "The admin service is temporarily unavailable.",
          suggestions: [
            "The system may be under maintenance",
            "Try again in a few minutes",
            "Check system status for updates"
          ],
          actionText: "Retry",
          actionColor: "default" as const
        }
        
      default:
        return {
          icon: AlertTriangle,
          title: "Network Error",
          description: error.message || "Unable to connect to the admin service.",
          suggestions: [
            "Check your internet connection",
            "Refresh the page to try again",
            "Contact support if the problem continues"
          ],
          actionText: "Retry",
          actionColor: "default" as const
        }
    }
  }

  const errorDetails = getErrorDetails()
  const IconComponent = errorDetails.icon

  return (
    <div className="flex items-center justify-center min-h-96 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <IconComponent className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {errorDetails.title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {errorDetails.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Code */}
          {error.status && (
            <div className="text-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Error {error.status}
              </span>
            </div>
          )}
          
          {/* Suggestions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">What you can try:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {onRetry && (
              <Button 
                onClick={onRetry}
                variant={errorDetails.actionColor}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {errorDetails.actionText}
              </Button>
            )}
            
            {onGoHome && (
              <Button 
                onClick={onGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Admin Home
              </Button>
            )}
          </div>
          
          {/* Technical Details (for development) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}