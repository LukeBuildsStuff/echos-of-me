'use client'

import React, { useState, useRef, useEffect, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

interface MobileOptimizedChatLayoutProps {
  children: ReactNode
  header?: ReactNode
  sidebar?: ReactNode
  voiceControls?: ReactNode
  inputArea?: ReactNode
  showSidebar?: boolean
  onToggleSidebar?: () => void
  className?: string
}

interface TouchState {
  startY: number
  startTime: number
  isScrolling: boolean
  direction: 'up' | 'down' | null
}

const MobileOptimizedChatLayout: React.FC<MobileOptimizedChatLayoutProps> = ({
  children,
  header,
  sidebar,
  voiceControls,
  inputArea,
  showSidebar = false,
  onToggleSidebar,
  className = ''
}) => {
  // Mobile-specific state
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [touchState, setTouchState] = useState<TouchState | null>(null)
  const [pullToRefreshDistance, setPullToRefreshDistance] = useState(0)
  const [showPullToRefresh, setShowPullToRefresh] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Voice controls state
  const [voiceControlsExpanded, setVoiceControlsExpanded] = useState(false)
  const [voiceControlsHeight, setVoiceControlsHeight] = useState(0)
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const voiceControlsRef = useRef<HTMLDivElement>(null)
  const pullIndicatorRef = useRef<HTMLDivElement>(null)
  
  // Detect virtual keyboard on mobile
  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const heightDifference = window.innerHeight - window.visualViewport.height
        setKeyboardHeight(heightDifference)
        setIsKeyboardVisible(heightDifference > 150) // Threshold for keyboard detection
      }
    }
    
    // Initial setup
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange)
      handleVisualViewportChange()
    }
    
    // Fallback for older browsers
    const handleResize = () => {
      const heightDifference = window.screen.height - window.innerHeight
      if (heightDifference > 300) { // Rough keyboard height threshold
        setIsKeyboardVisible(true)
        setKeyboardHeight(heightDifference)
      } else {
        setIsKeyboardVisible(false)
        setKeyboardHeight(0)
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Handle touch interactions for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const container = chatContainerRef.current
    
    if (!container) return
    
    setTouchState({
      startY: touch.clientY,
      startTime: Date.now(),
      isScrolling: false,
      direction: null
    })
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState) return
    
    const touch = e.touches[0]
    const container = chatContainerRef.current
    
    if (!container) return
    
    const deltaY = touch.clientY - touchState.startY
    const isAtTop = container.scrollTop === 0
    
    // Enable pull-to-refresh when at top and pulling down
    if (isAtTop && deltaY > 0) {
      e.preventDefault()
      const distance = Math.min(deltaY * 0.5, 120) // Damping effect
      setPullToRefreshDistance(distance)
      setShowPullToRefresh(distance > 60)
      
      // Update pull indicator
      if (pullIndicatorRef.current) {
        pullIndicatorRef.current.style.transform = `translateY(${distance}px)`
        pullIndicatorRef.current.style.opacity = String(Math.min(distance / 60, 1))
      }
    } else {
      // Normal scrolling
      setTouchState(prev => prev ? { ...prev, isScrolling: true } : null)
    }
  }
  
  const handleTouchEnd = async () => {
    if (!touchState) return
    
    // Trigger refresh if pulled far enough
    if (showPullToRefresh && pullToRefreshDistance > 60) {
      setIsRefreshing(true)
      
      // Simulate refresh (replace with actual refresh logic)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsRefreshing(false)
    }
    
    // Reset pull-to-refresh state
    setPullToRefreshDistance(0)
    setShowPullToRefresh(false)
    setTouchState(null)
    
    if (pullIndicatorRef.current) {
      pullIndicatorRef.current.style.transform = 'translateY(0)'
      pullIndicatorRef.current.style.opacity = '0'
    }
  }
  
  // Handle voice controls expansion
  const toggleVoiceControls = () => {
    setVoiceControlsExpanded(!voiceControlsExpanded)
  }
  
  // Update voice controls height when expanded/collapsed
  useEffect(() => {
    if (voiceControlsRef.current) {
      const height = voiceControlsExpanded ? voiceControlsRef.current.scrollHeight : 60
      setVoiceControlsHeight(height)
    }
  }, [voiceControlsExpanded])
  
  // Calculate safe areas and spacing
  const safeAreaInsetTop = 'env(safe-area-inset-top, 0px)'
  const safeAreaInsetBottom = 'env(safe-area-inset-bottom, 0px)'
  
  return (
    <div 
      className={`mobile-optimized-chat flex flex-col h-screen bg-heaven-gradient relative overflow-hidden ${className}`}
      style={{
        paddingTop: safeAreaInsetTop,
        paddingBottom: isKeyboardVisible ? '0px' : safeAreaInsetBottom
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        ref={pullIndicatorRef}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-50 transition-transform duration-300"
        style={{ opacity: 0 }}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-full p-3 shadow-lg border border-hope-200">
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-hope-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <ChevronDownIcon className="w-6 h-6 text-hope-600" />
          )}
        </div>
      </div>
      
      {/* Header */}
      {header && (
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-hope-200 relative z-20">
          {header}
        </div>
      )}
      
      <div className="flex flex-1 relative min-h-0">
        {/* Sidebar overlay for mobile */}
        {showSidebar && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
              onClick={onToggleSidebar}
            />
            <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-md border-r border-hope-200 z-40 lg:relative lg:z-auto overflow-y-auto transform transition-transform duration-300 lg:transform-none">
              {sidebar}
            </div>
          </>
        )}
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Chat messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto overscroll-behavior-y-contain"
            style={{
              marginBottom: `${voiceControlsHeight + (isKeyboardVisible ? 0 : 120)}px`,
              paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0px'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Add top padding for pull-to-refresh space */}
            <div style={{ height: `${pullToRefreshDistance}px` }} />
            
            <div className="p-4">
              {children}
            </div>
          </div>
          
          {/* Voice controls (expandable on mobile) */}
          {voiceControls && (
            <div 
              ref={voiceControlsRef}
              className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-hope-200 transition-all duration-300 z-30"
              style={{
                height: `${voiceControlsHeight}px`,
                paddingBottom: isKeyboardVisible ? '0px' : safeAreaInsetBottom,
                transform: isKeyboardVisible ? 'translateY(100%)' : 'translateY(0)'
              }}
            >
              {/* Expand/collapse handle */}
              <div className="flex justify-center py-2 border-b border-hope-200/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleVoiceControls}
                  className="flex items-center gap-2 text-peace-600 hover:text-peace-800"
                >
                  <div className="w-8 h-1 bg-peace-300 rounded-full"></div>
                  {voiceControlsExpanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronUpIcon className="w-4 h-4" />
                  )}
                  <span className="text-xs">Voice Controls</span>
                </Button>
              </div>
              
              {/* Voice controls content */}
              <div className={`overflow-hidden transition-all duration-300 ${
                voiceControlsExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                <div className="p-4">
                  {voiceControls}
                </div>
              </div>
              
              {/* Collapsed state preview */}
              {!voiceControlsExpanded && (
                <div className="px-4 pb-2 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-peace-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Voice ready</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Input area */}
          {inputArea && (
            <div 
              className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-hope-200 z-20"
              style={{
                paddingBottom: isKeyboardVisible ? '8px' : safeAreaInsetBottom,
                transform: voiceControls && !isKeyboardVisible 
                  ? `translateY(-${voiceControlsHeight}px)` 
                  : 'translateY(0)'
              }}
            >
              {inputArea}
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile-specific styles */}
      <style jsx global>{`
        .mobile-optimized-chat {
          /* Prevent zoom on input focus */
          -webkit-text-size-adjust: 100%;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        
        .mobile-optimized-chat input,
        .mobile-optimized-chat textarea {
          -webkit-user-select: text;
          user-select: text;
          font-size: 16px; /* Prevent zoom on iOS */
        }
        
        /* Smooth scrolling with momentum */
        .mobile-optimized-chat .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
        }
        
        /* Touch-friendly tap targets */
        .mobile-optimized-chat button,
        .mobile-optimized-chat [role="button"] {
          min-height: 44px;
          min-width: 44px;
          touch-action: manipulation;
        }
        
        /* Prevent text selection on UI elements */
        .mobile-optimized-chat .text-peace-600,
        .mobile-optimized-chat .text-peace-700,
        .mobile-optimized-chat .text-peace-800 {
          -webkit-user-select: none;
          user-select: none;
        }
        
        /* Allow text selection in message content */
        .mobile-optimized-chat .font-compassionate {
          -webkit-user-select: text;
          user-select: text;
        }
        
        /* Haptic feedback on touch */
        .mobile-optimized-chat button:active {
          transform: scale(0.98);
          transition: transform 0.1s ease;
        }
        
        /* Optimize for dark mode */
        @media (prefers-color-scheme: dark) {
          .mobile-optimized-chat {
            color-scheme: light; /* Force light mode for grief-sensitive design */
          }
        }
        
        /* Landscape orientation adjustments */
        @media screen and (orientation: landscape) and (max-height: 500px) {
          .mobile-optimized-chat .p-4 {
            padding: 0.75rem;
          }
          
          .mobile-optimized-chat .space-y-4 > * + * {
            margin-top: 0.75rem;
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .mobile-optimized-chat .border-hope-200 {
            border-color: #000;
          }
          
          .mobile-optimized-chat .text-peace-600 {
            color: #000;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .mobile-optimized-chat * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Large text support */
        @media (prefers-increased-contrast: more) {
          .mobile-optimized-chat {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  )
}

export default MobileOptimizedChatLayout