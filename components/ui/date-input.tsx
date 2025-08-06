'use client'

import { cn } from "@/lib/utils"

interface DateInputProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
  maxDate?: string // For birthdays, default to today
}

export function DateInput({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  label,
  maxDate = new Date().toISOString().split('T')[0] // Default to today for birthdays
}: DateInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs text-peace-600 font-supportive block">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          max={maxDate}
          disabled={disabled}
          className={cn(
            // Base styles matching your design system
            "flex min-h-[48px] w-full rounded-embrace border-2 border-hope-200 bg-white px-3 py-3 text-base",
            // Focus styles
            "focus:border-hope-400 focus:ring-4 focus:ring-hope-100 focus:outline-none",
            // Hover styles
            "hover:border-hope-300 transition-all duration-200",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Text and placeholder styling
            "text-peace-800 font-gentle",
            // Mobile improvements
            "touch-manipulation",
            className
          )}
        />
        
        {/* Help text */}
        <p className="text-xs text-peace-500 mt-1 font-supportive">
          💡 Click the calendar icon to select a date easily
        </p>
        
        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-peace-400 hover:text-red-600 text-lg leading-none"
            aria-label="Clear date"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}