import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import MobileViewportFix from '@/components/MobileViewportFix'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Echos Of Me',
  description: 'Create an AI that echoes your thoughts, personality, and wisdom',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MobileViewportFix />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}