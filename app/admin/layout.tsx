'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { AdminErrorFallback } from '@/components/admin/AdminErrorFallback'

export default function SimplifiedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary
      FallbackComponent={AdminErrorFallback}
      onReset={() => window.location.reload()}
    >
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </ErrorBoundary>
  )
}