'use client'

import { useContext } from 'react'
import { ToastContext } from '@/components/ui/toast'
import type { Toast } from '@/components/ui/toast'

// Re-export the useToast hook from the toast component
export { useToast } from '@/components/ui/toast'

// Re-export types for convenience
export type { Toast, ToastType, ToastPosition } from '@/components/ui/toast'

// Additional helper exports
export { ToastProvider, ToastAction, useNetworkToast } from '@/components/ui/toast'