'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ClickableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  onClick?: () => void
  children: React.ReactNode
}

export function ClickableCard({ onClick, className, children, ...props }: ClickableCardProps) {
  return (
    <Card 
      className={cn("hover:shadow-lg transition-all duration-200 cursor-pointer group", className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </Card>
  )
}