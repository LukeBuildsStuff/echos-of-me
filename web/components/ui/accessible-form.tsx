'use client'

import React, { forwardRef, useId, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAriaFormValidation, useAccessibility } from '@/hooks/useAccessibility'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Eye, EyeOff, HelpCircle } from 'lucide-react'

// Enhanced Input Component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  showLabel?: boolean
  required?: boolean
  validationState?: 'valid' | 'invalid' | 'none'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onValidate?: (value: string) => string | undefined
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(({
  label,
  error,
  helperText,
  showLabel = true,
  required = false,
  validationState = 'none',
  leftIcon,
  rightIcon,
  className,
  onValidate,
  onBlur,
  onChange,
  type = 'text',
  ...props
}, ref) => {
  const inputId = useId()
  const errorId = useId()
  const helperId = useId()
  const [internalError, setInternalError] = useState<string>()
  const [showPassword, setShowPassword] = useState(false)
  const { announce } = useAccessibility()

  const displayError = error || internalError
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onValidate) {
      const validationError = onValidate(e.target.value)
      setInternalError(validationError)
      
      if (validationError) {
        announce(`Validation error: ${validationError}`, 'assertive')
      }
    }
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear validation errors when user starts typing
    if (internalError) {
      setInternalError(undefined)
    }
    onChange?.(e)
  }

  const getValidationState = () => {
    if (displayError) return 'invalid'
    if (validationState !== 'none') return validationState
    return 'none'
  }

  const currentValidationState = getValidationState()

  return (
    <div className="space-y-2">
      {/* Label */}
      <label 
        htmlFor={inputId}
        className={cn(
          "block text-sm font-medium",
          showLabel ? "text-gray-700" : "sr-only",
          required && "after:content-['*'] after:ml-0.5 after:text-red-500"
        )}
      >
        {label}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">{leftIcon}</div>
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
            leftIcon && "pl-10",
            (rightIcon || isPassword) && "pr-10",
            currentValidationState === 'invalid' && "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500",
            currentValidationState === 'valid' && "border-green-300 text-green-900 placeholder-green-300 focus:ring-green-500 focus:border-green-500",
            className
          )}
          aria-invalid={currentValidationState === 'invalid'}
          aria-describedby={cn(
            displayError && errorId,
            helperText && helperId
          )}
          aria-required={required}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />

        {/* Right Icons */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {/* Validation State Icon */}
          {currentValidationState === 'valid' && (
            <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
          )}
          {currentValidationState === 'invalid' && (
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          )}
          
          {/* Password Toggle */}
          {isPassword && (
            <button
              type="button"
              className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
          
          {/* Custom Right Icon */}
          {rightIcon && !isPassword && (
            <div className="h-5 w-5 text-gray-400">{rightIcon}</div>
          )}
        </div>
      </div>

      {/* Helper Text */}
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {displayError && (
        <p 
          id={errorId} 
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {displayError}
        </p>
      )}
    </div>
  )
})

AccessibleInput.displayName = 'AccessibleInput'

// Enhanced Select Component
interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helperText?: string
  showLabel?: boolean
  required?: boolean
  placeholder?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(({
  label,
  error,
  helperText,
  showLabel = true,
  required = false,
  placeholder,
  options,
  className,
  ...props
}, ref) => {
  const selectId = useId()
  const errorId = useId()
  const helperId = useId()

  return (
    <div className="space-y-2">
      {/* Label */}
      <label 
        htmlFor={selectId}
        className={cn(
          "block text-sm font-medium",
          showLabel ? "text-gray-700" : "sr-only",
          required && "after:content-['*'] after:ml-0.5 after:text-red-500"
        )}
      >
        {label}
      </label>

      {/* Select */}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
          error && "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={cn(
          error && errorId,
          helperText && helperId
        )}
        aria-required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Helper Text */}
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
})

AccessibleSelect.displayName = 'AccessibleSelect'

// Enhanced Textarea Component
interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helperText?: string
  showLabel?: boolean
  required?: boolean
  characterLimit?: number
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(({
  label,
  error,
  helperText,
  showLabel = true,
  required = false,
  characterLimit,
  className,
  onChange,
  value,
  ...props
}, ref) => {
  const textareaId = useId()
  const errorId = useId()
  const helperId = useId()
  const countId = useId()
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    if (typeof value === 'string') {
      setCharCount(value.length)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length)
    onChange?.(e)
  }

  const isOverLimit = characterLimit && charCount > characterLimit

  return (
    <div className="space-y-2">
      {/* Label */}
      <label 
        htmlFor={textareaId}
        className={cn(
          "block text-sm font-medium",
          showLabel ? "text-gray-700" : "sr-only",
          required && "after:content-['*'] after:ml-0.5 after:text-red-500"
        )}
      >
        {label}
      </label>

      {/* Textarea */}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
          (error || isOverLimit) && "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500",
          className
        )}
        aria-invalid={!!(error || isOverLimit)}
        aria-describedby={cn(
          (error || isOverLimit) && errorId,
          helperText && helperId,
          characterLimit && countId
        )}
        aria-required={required}
        onChange={handleChange}
        value={value}
        {...props}
      />

      {/* Character Count */}
      {characterLimit && (
        <div className="flex justify-between items-center">
          <div></div>
          <p 
            id={countId}
            className={cn(
              "text-sm",
              isOverLimit ? "text-red-600" : "text-gray-500"
            )}
            aria-live="polite"
          >
            {charCount}/{characterLimit}
          </p>
        </div>
      )}

      {/* Helper Text */}
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {(error || isOverLimit) && (
        <p 
          id={errorId} 
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error || `Character limit exceeded by ${charCount - characterLimit!}`}
        </p>
      )}
    </div>
  )
})

AccessibleTextarea.displayName = 'AccessibleTextarea'

// Fieldset Component for Grouping
interface AccessibleFieldsetProps {
  legend: string
  children: React.ReactNode
  className?: string
  required?: boolean
  error?: string
}

export function AccessibleFieldset({ 
  legend, 
  children, 
  className,
  required = false,
  error 
}: AccessibleFieldsetProps) {
  const errorId = useId()

  return (
    <fieldset 
      className={cn("space-y-4", className)}
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className={cn(
        "text-sm font-medium text-gray-700",
        required && "after:content-['*'] after:ml-0.5 after:text-red-500"
      )}>
        {legend}
      </legend>
      
      {error && (
        <p 
          id={errorId}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
      
      <div className="space-y-3">
        {children}
      </div>
    </fieldset>
  )
}

// Form Error Summary Component
interface FormErrorSummaryProps {
  errors: Array<{ field: string; message: string }>
  className?: string
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const { announce } = useAccessibility()

  useEffect(() => {
    if (errors.length > 0) {
      announce(`Form has ${errors.length} error${errors.length > 1 ? 's' : ''}`, 'assertive')
    }
  }, [errors.length, announce])

  if (errors.length === 0) return null

  return (
    <Alert className={cn("border-red-200 bg-red-50", className)} role="alert">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription>
        <h3 className="font-medium text-red-800 mb-2">
          Please correct the following error{errors.length > 1 ? 's' : ''}:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-red-700">
          {errors.map((error, index) => (
            <li key={index}>
              <strong>{error.field}:</strong> {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

// Form Instructions Component
interface FormInstructionsProps {
  children: React.ReactNode
  className?: string
}

export function FormInstructions({ children, className }: FormInstructionsProps) {
  const instructionsId = useId()

  return (
    <div 
      id={instructionsId}
      className={cn("text-sm text-gray-600 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md", className)}
      role="region"
      aria-labelledby={`${instructionsId}-title`}
    >
      <h3 id={`${instructionsId}-title`} className="font-medium text-blue-900 mb-1">
        Instructions
      </h3>
      {children}
    </div>
  )
}