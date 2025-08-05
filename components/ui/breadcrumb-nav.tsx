'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
  const router = useRouter()

  if (items.length === 0) return null

  return (
    <nav className={`flex items-center text-sm text-gray-500 ${className}`} aria-label="Breadcrumb">
      {items.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-2 text-gray-300">/</span>}
          {crumb.href ? (
            <button
              onClick={() => router.push(crumb.href!)}
              className="hover:text-gray-700 transition-colors focus:outline-none focus:underline"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}