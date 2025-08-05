'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Base loading spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-blue-500 ${sizes[size]} ${className}`} />
  )
}

// Loading button state
interface LoadingButtonProps {
  children: React.ReactNode
  loading?: boolean
  loadingText?: string
  className?: string
}

export function LoadingButton({ 
  children, 
  loading = false, 
  loadingText = 'Connecting gently...', 
  className = '' 
}: LoadingButtonProps) {
  if (!loading) return <>{children}</>

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LoadingSpinner size="sm" />
      <span>{loadingText}</span>
    </div>
  )
}

// Page loading component
interface PageLoadingProps {
  message?: string
  className?: string
}

export function PageLoading({ 
  message = 'Preparing your sacred space for connection...', 
  className = '' 
}: PageLoadingProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gray-50 ${className}`}>
      <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mb-6">
            <LoadingSpinner size="lg" className="mx-auto" />
          </div>
          <h3 className="text-lg font-compassionate text-peace-800 mb-2">
            One moment, please
          </h3>
          <p className="text-sm text-peace-600 leading-relaxed font-gentle">
            {message}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Content loading skeleton
interface ContentLoadingProps {
  lines?: number
  className?: string
}

export function ContentLoading({ lines = 3, className = '' }: ContentLoadingProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-peace-100 h-4 rounded"
          style={{
            width: `${Math.random() * 40 + 60}%`
          }}
        />
      ))}
    </div>
  )
}

// Card loading skeleton
export function CardLoading({ className = '' }: { className?: string }) {
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="animate-pulse bg-peace-100 h-6 rounded w-3/4 mb-2" />
        <div className="animate-pulse bg-peace-100 h-4 rounded w-1/2" />
      </CardHeader>
      <CardContent>
        <ContentLoading lines={4} />
      </CardContent>
    </Card>
  )
}

// List loading skeleton
interface ListLoadingProps {
  items?: number
  className?: string
}

export function ListLoading({ items = 5, className = '' }: ListLoadingProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <CardLoading key={i} />
      ))}
    </div>
  )
}

// Inline loading state
interface InlineLoadingProps {
  text?: string
  className?: string
}

export function InlineLoading({ 
  text = 'Connecting with love...', 
  className = '' 
}: InlineLoadingProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-peace-600 font-gentle ${className}`}>
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  )
}

// Overlay loading (for forms/modals)
interface OverlayLoadingProps {
  message?: string
  visible: boolean
}

export function OverlayLoading({ 
  message = 'Gentle processing in progress...', 
  visible 
}: OverlayLoadingProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-gentle-900 bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="mx-4 shadow-2xl border-0 bg-white/90 backdrop-blur-md">
        <CardContent className="p-8 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-compassionate text-peace-800 mb-2">
            Taking a gentle moment
          </h3>
          <p className="text-sm text-peace-600 font-gentle">
            {message}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Breathing animation for gentle loading states
export function BreathingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-tender-400 rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 0.3}s`,
            animationDuration: '2s'
          }}
        />
      ))}
    </div>
  )
}

// Progress loading for multi-step processes
interface ProgressLoadingProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function ProgressLoading({ 
  steps, 
  currentStep, 
  className = '' 
}: ProgressLoadingProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h3 className="text-lg font-gentle text-peace-800 mb-2">
          {steps[currentStep]}
        </h3>
        <p className="text-comfort text-peace-600">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
      
      <div className="w-full bg-peace-200 rounded-full h-2">
        <div
          className="bg-hope-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-sm ${
              index < currentStep
                ? 'text-hope-600'
                : index === currentStep
                ? 'text-peace-800 font-medium'
                : 'text-peace-400'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                index < currentStep
                  ? 'bg-hope-500'
                  : index === currentStep
                  ? 'bg-peace-500 animate-pulse'
                  : 'bg-peace-300'
              }`}
            />
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Default Loading component export for compatibility
export const Loading = LoadingSpinner