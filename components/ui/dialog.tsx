'use client'

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  className?: string
  children: React.ReactNode
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

interface DialogDescriptionProps {
  className?: string
  children: React.ReactNode
}

interface DialogFooterProps {
  className?: string
  children: React.ReactNode
}

interface DialogTriggerProps {
  asChild?: boolean
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

const Dialog = ({ open, onClose, children }: DialogProps) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}

const DialogContent = ({ className, children }: DialogContentProps) => (
  <div className={cn(
    "bg-white rounded-sanctuary shadow-lg max-w-lg w-full mx-auto p-6 animate-fade-in",
    "border border-peace-200 max-h-[90vh] overflow-y-auto",
    className
  )}>
    {children}
  </div>
)

const DialogHeader = ({ className, children }: DialogHeaderProps) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}>
    {children}
  </div>
)

const DialogTitle = ({ className, children }: DialogTitleProps) => (
  <h2 className={cn(
    "text-lg font-gentle text-peace-800 leading-none tracking-tight",
    className
  )}>
    {children}
  </h2>
)

const DialogDescription = ({ className, children }: DialogDescriptionProps) => (
  <p className={cn("text-comfort text-peace-600 font-compassionate", className)}>
    {children}
  </p>
)

const DialogFooter = ({ className, children }: DialogFooterProps) => (
  <div className={cn(
    "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 mt-6",
    className
  )}>
    {children}
  </div>
)

const DialogTrigger = ({ className, children, onClick }: DialogTriggerProps) => (
  <button 
    className={cn("cursor-pointer", className)}
    onClick={onClick}
  >
    {children}
  </button>
)

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
}