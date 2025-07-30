'use client'

import { useEffect } from 'react'

/**
 * MobileViewportFix - Handles dynamic viewport height issues on mobile devices
 * 
 * This component fixes common mobile viewport issues including:
 * - iOS Safari's changing viewport height during scroll
 * - Dynamic browser UI show/hide behavior
 * - Proper safe area handling
 */
export default function MobileViewportFix() {
  useEffect(() => {
    const setVH = () => {
      // Calculate actual viewport height and set CSS custom property
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      
      // Also handle the newer dynamic viewport units fallback
      if (!CSS.supports('height', '100dvh')) {
        document.documentElement.style.setProperty('--dvh', `${window.innerHeight}px`)
      }
    }

    const handleResize = () => {
      setVH()
    }

    const handleOrientationChange = () => {
      // Delay to ensure proper viewport calculation after orientation change
      setTimeout(setVH, 100)
    }

    const handleVisibilityChange = () => {
      // Recalculate when page becomes visible (helps with iOS Safari UI changes)
      if (!document.hidden) {
        setTimeout(setVH, 100)
      }
    }

    const handleFocus = () => {
      // Handle virtual keyboard show/hide on mobile
      setTimeout(setVH, 300)
    }

    const handleBlur = () => {
      // Handle virtual keyboard show/hide on mobile
      setTimeout(setVH, 300)
    }

    // Initialize
    setVH()

    // Event listeners
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Prevent iOS bounce scrolling issues without breaking scrolling
  useEffect(() => {
    let startY = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
    }
    
    const preventBounce = (e: TouchEvent) => {
      const target = e.target as Element
      
      // Find the closest scrollable element (including the target itself)
      const scrollableElement = target.closest('.mobile-scroll, .overflow-y-auto, .overflow-auto, [data-scroll="true"]')
      
      // If we're in a scrollable element, allow normal scrolling
      if (scrollableElement) {
        return
      }
      
      // Calculate scroll direction
      const currentY = e.touches[0].clientY
      const deltaY = startY - currentY
      const isScrollingUp = deltaY > 0
      const isScrollingDown = deltaY < 0
      
      // Get current scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const documentHeight = document.documentElement.scrollHeight
      const windowHeight = window.innerHeight
      const maxScroll = documentHeight - windowHeight
      
      // Prevent bounce only at scroll boundaries
      const atTop = scrollTop <= 0
      const atBottom = scrollTop >= maxScroll
      
      // Prevent bounce at top when trying to scroll up further
      if (atTop && isScrollingDown) {
        e.preventDefault()
        return
      }
      
      // Prevent bounce at bottom when trying to scroll down further
      if (atBottom && isScrollingUp) {
        e.preventDefault()
        return
      }
      
      // Allow all other scrolling
    }

    // Only apply bounce prevention on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      // Register both touchstart and touchmove handlers
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', preventBounce, { passive: false })
      
      // Don't set overflow hidden - this breaks scrolling!
      // Instead, ensure proper touch handling
      ;(document.body.style as any).webkitOverflowScrolling = 'touch'
      ;(document.documentElement.style as any).webkitOverflowScrolling = 'touch'
      
      // Ensure body allows scrolling
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', preventBounce)
        ;(document.body.style as any).webkitOverflowScrolling = ''
        ;(document.documentElement.style as any).webkitOverflowScrolling = ''
        document.body.style.overflowY = ''
        document.documentElement.style.overflowY = ''
      }
    } else {
      // For non-iOS devices, ensure smooth scrolling
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
      
      return () => {
        document.body.style.overflowY = ''
        document.documentElement.style.overflowY = ''
      }
    }
  }, [])

  return null // This is a utility component with no visual output
}

/**
 * Hook to get current viewport dimensions with mobile fixes
 */
export function useViewportDimensions() {
  useEffect(() => {
    const updateViewport = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  return {
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }
}