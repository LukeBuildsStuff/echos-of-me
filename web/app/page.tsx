import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">
          Echos Of Me
        </h1>
        <p className="text-xl text-center text-muted-foreground mb-12">
          Create an AI that echoes your thoughts, personality, and wisdom.
          Train it daily by sharing your perspectives on life.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/auth/register">
              Get Started
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/signin">
              Sign In
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}