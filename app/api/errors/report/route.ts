import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ErrorReport {
  errorId?: string
  error: {
    name: string
    message: string
    stack?: string
  }
  errorInfo?: {
    componentStack?: string
  }
  context: string
  timestamp: string
  userAgent: string
  url: string
  retryCount?: number
  additionalData?: any
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ErrorReport
    const headersList = headers()
    const userAgent = headersList.get('user-agent') || 'Unknown'
    const clientIP = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'Unknown'

    // Enhanced error report with server-side info
    const enhancedReport = {
      ...body,
      serverTimestamp: new Date().toISOString(),
      clientIP,
      serverUserAgent: userAgent,
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown'
    }

    // Log error to console (in production, this might go to structured logging)
    console.error('Error Report Received:', {
      errorId: enhancedReport.errorId,
      context: enhancedReport.context,
      error: enhancedReport.error.message,
      url: enhancedReport.url,
      timestamp: enhancedReport.timestamp,
      clientIP
    })

    // In production, you would typically:
    // 1. Send to error monitoring service (Sentry, Bugsnag, etc.)
    // 2. Store in database for analysis
    // 3. Alert on critical errors
    // 4. Trigger automated responses

    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external monitoring service
      // await sendToMonitoringService(enhancedReport)
      
      // Example: Store in database
      // await storeErrorReport(enhancedReport)
      
      // Example: Check for critical errors and alert
      // if (isCriticalError(enhancedReport)) {
      //   await alertOnCriticalError(enhancedReport)
      // }
    }

    // For development, provide more detailed response
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Error report received and logged',
        errorId: enhancedReport.errorId,
        context: enhancedReport.context,
        timestamp: enhancedReport.serverTimestamp
      })
    }

    // Production response (minimal info)
    return NextResponse.json({
      success: true,
      errorId: enhancedReport.errorId
    })

  } catch (error) {
    console.error('Failed to process error report:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process error report' 
      },
      { status: 500 }
    )
  }
}

// Helper functions (implement based on your monitoring setup)

async function sendToMonitoringService(report: any) {
  // Example implementation for Sentry
  // Sentry.captureException(new Error(report.error.message), {
  //   contexts: {
  //     errorReport: report
  //   }
  // })
}

async function storeErrorReport(report: any) {
  // Example: Store in database
  // const db = await getDatabase()
  // await db.collection('error_reports').add(report)
}

function isCriticalError(report: any): boolean {
  // Define criteria for critical errors
  const criticalContexts = ['training', 'admin']
  const criticalErrorTypes = ['network', 'database', 'authentication']
  
  return criticalContexts.includes(report.context) ||
         criticalErrorTypes.some(type => 
           report.error.message.toLowerCase().includes(type)
         )
}

async function alertOnCriticalError(report: any) {
  // Example: Send to alerting system
  // await sendSlackAlert(report)
  // await sendEmailAlert(report)
}