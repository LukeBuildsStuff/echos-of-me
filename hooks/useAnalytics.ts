import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

let sessionId: string | null = null

// Generate a session ID once per browser session
function getSessionId(): string {
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  return sessionId
}

export async function trackEvent(eventType: string, eventData?: any, pageUrl?: string) {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': getSessionId()
      },
      body: JSON.stringify({
        eventType,
        eventData,
        pageUrl: pageUrl || window.location.pathname
      })
    })
  } catch (error) {
    console.error('Analytics tracking failed:', error)
  }
}

export function useAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    // Track page view
    trackEvent('page_view', { pathname })
  }, [pathname])

  const trackClick = (elementName: string, additionalData?: any) => {
    trackEvent('click', { 
      element: elementName,
      ...additionalData 
    })
  }

  const trackFormSubmit = (formName: string, additionalData?: any) => {
    trackEvent('form_submit', { 
      form: formName,
      ...additionalData 
    })
  }

  const trackUserAction = (action: string, additionalData?: any) => {
    trackEvent('user_action', { 
      action,
      ...additionalData 
    })
  }

  return {
    trackClick,
    trackFormSubmit,
    trackUserAction,
    trackEvent
  }
}