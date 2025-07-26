import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-comfort-50">
      {/* Hero Section */}
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="max-w-6xl w-full text-center space-y-8">
          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold text-peace-900 tracking-tight animate-gentle-fade-in">
              Echos Of Me
            </h1>
            <div className="text-2xl md:text-3xl text-comfort-700 font-gentle leading-relaxed max-w-4xl mx-auto">
              Preserve your love, wisdom, and voice for the people who matter most
            </div>
          </div>

          {/* Sacred Mission Statement */}
          <div className="bg-white/80 backdrop-blur rounded-sanctuary border border-peace-200 p-embrace shadow-lg max-w-4xl mx-auto animate-gentle-fade-in">
            <p className="text-lg text-peace-700 leading-relaxed font-compassionate">
              When someone you love passes away, their wisdom, stories, and unique way of loving shouldn't be lost forever. 
              <span className="text-comfort-600 font-medium"> Echos Of Me preserves the irreplaceable essence of parents, grandparents, and loved ones</span> — 
              so their children and family can still feel their presence, seek their guidance, and hear their voice even after they're gone.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-contemplation max-w-5xl mx-auto mt-reverence">
            <Card className="bg-white/90 border-comfort-200 hover:shadow-lg transition-all duration-300 animate-gentle-fade-in">
              <CardHeader className="text-center">
                <div className="text-4xl mb-pause">💝</div>
                <CardTitle className="text-embrace font-compassionate text-comfort-800">Preserve Love & Wisdom</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-comfort text-peace-600 leading-relaxed">
                  Answer thousands of heartfelt questions about your values, stories, and the unique way you love and guide your family.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border-hope-200 hover:shadow-lg transition-all duration-300 animate-gentle-fade-in">
              <CardHeader className="text-center">
                <div className="text-4xl mb-pause">🤖</div>
                <CardTitle className="text-embrace font-compassionate text-hope-800">AI That Sounds Like You</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-comfort text-peace-600 leading-relaxed">
                  Advanced AI learns not just your words, but your heart — how you comfort, advise, and express unconditional love.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border-memory-200 hover:shadow-lg transition-all duration-300 animate-gentle-fade-in">
              <CardHeader className="text-center">
                <div className="text-4xl mb-pause">💌</div>
                <CardTitle className="text-embrace font-compassionate text-memory-800">Messages for the Future</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-comfort text-peace-600 leading-relaxed">
                  Create milestone messages for weddings, graduations, difficult times — ensuring your love reaches them when they need it most.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="pt-reverence space-y-contemplation animate-gentle-fade-in">
            <div className="space-y-pause">
              <h2 className="text-2xl font-gentle text-peace-800">Start Preserving Your Legacy Today</h2>
              <p className="text-presence text-peace-600 max-w-2xl mx-auto leading-relaxed">
                Every question you answer becomes an irreplaceable gift to your family. 
                Begin building a digital legacy that truly captures who you are.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-comfort justify-center items-center">
              <Button size="lg" className="px-sanctuary py-comfort text-presence font-compassionate" asChild>
                <Link href="/auth/register">
                  🌟 Begin Your Legacy
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="px-sanctuary py-comfort text-presence" asChild>
                <Link href="/auth/signin">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>

          {/* Privacy & Trust */}
          <div className="pt-contemplation border-t border-peace-200 mt-reverence">
            <div className="flex flex-col md:flex-row justify-center items-center gap-embrace text-gentle text-peace-500">
              <div className="flex items-center gap-breath">
                <span className="text-hope-500">🔒</span>
                <span>Privacy-First Design</span>
              </div>
              <div className="hidden md:block w-1 h-1 bg-peace-300 rounded-full"></div>
              <div className="flex items-center gap-breath">
                <span className="text-comfort-500">💝</span>
                <span>Built with Love & Respect</span>
              </div>
              <div className="hidden md:block w-1 h-1 bg-peace-300 rounded-full"></div>
              <div className="flex items-center gap-breath">
                <span className="text-memory-500">🏠</span>
                <span>Your Data Stays Yours</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}