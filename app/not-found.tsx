import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-peace-50 to-comfort-50">
      <Card className="w-full max-w-lg mx-auto shadow-lg border border-peace-200">
        <CardHeader className="text-center pb-4">
          <div className="text-6xl mb-4">🧭</div>
          <CardTitle className="text-2xl font-gentle text-peace-800 mb-2">
            This Path Doesn&apos;t Exist
          </CardTitle>
          <p className="text-comfort text-peace-600 leading-relaxed">
            It seems you&apos;ve wandered off the legacy trail. Let&apos;s guide you back 
            to where you can continue preserving your precious memories.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Helpful Navigation */}
          <div className="bg-gradient-to-r from-hope-50 to-comfort-50 rounded-embrace p-4 border border-hope-200">
            <h4 className="font-gentle text-hope-800 mb-3">Where would you like to go?</h4>
            <div className="space-y-3">
              <Link href="/dashboard" className="block">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-hope-200 hover:border-hope-300 hover:shadow-sm transition-all duration-200">
                  <span className="text-2xl">🏠</span>
                  <div>
                    <div className="font-medium text-hope-800">Dashboard</div>
                    <div className="text-sm text-hope-600">Your legacy journey home</div>
                  </div>
                </div>
              </Link>
              
              <Link href="/daily-question" className="block">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-hope-200 hover:border-hope-300 hover:shadow-sm transition-all duration-200">
                  <span className="text-2xl">❓</span>
                  <div>
                    <div className="font-medium text-hope-800">Daily Questions</div>
                    <div className="text-sm text-hope-600">Continue preserving memories</div>
                  </div>
                </div>
              </Link>
              
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1 bg-hope-500 hover:bg-hope-600 text-white">
              <Link href="/dashboard">
                Return Home
              </Link>
            </Button>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1 border-peace-300 text-peace-700 hover:bg-peace-50"
            >
              Go Back
            </Button>
          </div>

          {/* Gentle Encouragement */}
          <div className="text-center p-4 bg-comfort-50 rounded-embrace border border-comfort-200">
            <p className="text-comfort text-comfort-600 mb-1">
              🧡 Lost but not forgotten
            </p>
            <p className="text-whisper text-comfort-500">
              Every step in your legacy journey has meaning - let&apos;s continue together
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}