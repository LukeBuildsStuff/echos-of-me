'use client'

import { ErrorBoundary } from 'react-error-boundary'
import { AdminErrorFallback } from '@/components/admin/AdminErrorFallback'

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary
      FallbackComponent={AdminErrorFallback}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  )
}