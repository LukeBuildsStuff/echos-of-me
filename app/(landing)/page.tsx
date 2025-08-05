'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CTA from "@/components/CTA";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Only redirect authenticated users, let unauthenticated users see the landing page
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  // Show landing page for unauthenticated users and while loading
  return (
    <>
      <Hero />
      
      {/* What is an Echo? Section */}
      <section 
        className="py-16 md:py-20 lg:py-28 bg-gradient-to-b from-blue-50/50 to-white dark:from-gray-dark dark:to-gray-dark"
        aria-labelledby="what-is-echo-heading"
      >
        <div className="container">
          <div className="mx-auto max-w-[800px] text-center">
            <h2 id="what-is-echo-heading" className="mb-6 text-3xl font-bold !leading-tight text-black dark:text-white sm:text-4xl md:text-[45px]">
              What is an Echo?
            </h2>
            <p className="mb-8 text-base !leading-relaxed text-body-color md:text-lg">
              An echo is your personal AI companion that learns to speak, think, and respond just like you. 
              It's not just stored memories — it's a living conversation partner that your loved ones can turn to 
              for comfort, guidance, and connection long after you're gone.
            </p>
            
            {/* How it Works Visual */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mt-12">
              <div className="wow fadeInUp" data-wow-delay=".1s">
                <div className="mb-4 mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-2xl">
                  💭
                </div>
                <h4 className="mb-3 text-lg font-semibold text-black dark:text-white">
                  Share Your Stories
                </h4>
                <p className="text-sm text-body-color leading-relaxed">
                  Answer thoughtful questions about your life, values, and experiences. 
                  Each response helps your echo learn your unique voice and perspective.
                </p>
              </div>
              
              <div className="wow fadeInUp" data-wow-delay=".15s">
                <div className="mb-4 mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <h4 className="mb-3 text-lg font-semibold text-black dark:text-white">
                  AI Learns Your Essence
                </h4>
                <p className="text-sm text-body-color leading-relaxed">
                  Advanced AI technology captures not just your words, but your heart — 
                  how you comfort, advise, and express love to those who matter most.
                </p>
              </div>
              
              <div className="wow fadeInUp" data-wow-delay=".2s">
                <div className="mb-4 mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-2xl">
                  💬
                </div>
                <h4 className="mb-3 text-lg font-semibold text-black dark:text-white">
                  Family Conversations
                </h4>
                <p className="text-sm text-body-color leading-relaxed">
                  Your loved ones can chat with your echo anytime — asking for advice, 
                  sharing good news, or simply feeling your loving presence when they need it.
                </p>
              </div>
            </div>
            
            {/* Example Conversation */}
            <div className="mt-12 bg-white/80 dark:bg-gray-dark/80 rounded-2xl p-8 backdrop-blur">
              <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                A Glimpse of Connection
              </h4>
              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-body-color font-medium mb-1">Your daughter asks:</p>
                  <p className="text-gray-800 dark:text-gray-200">"I'm feeling overwhelmed with the new job. What would you tell me?"</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <p className="text-sm text-body-color font-medium mb-1">Your echo responds:</p>
                  <p className="text-gray-800 dark:text-gray-200">"Oh sweetheart, remember when I told you that feeling overwhelmed just means you care deeply? Take it one day at a time, like we used to do with your school projects. You're stronger than you know, and I'm so proud of your courage to take on new challenges."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Value Proposition Section */}
      <section 
        className="py-16 md:py-20 lg:py-28 bg-gradient-to-b from-white to-blue-50/30 dark:from-gray-dark dark:to-gray-dark"
        aria-labelledby="value-props-heading"
      >
        <div className="container">
          <h2 id="value-props-heading" className="sr-only">Who Echos Of Me is for</h2>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* For Parents */}
            <div className="wow fadeInUp group" data-wow-delay=".1s">
              <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-gray-dark">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 opacity-20"></div>
                <div className="relative">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-2xl" role="img" aria-label="family">
                    👨‍👩‍👧‍👦
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-black dark:text-white">
                    For Parents
                  </h3>
                  <p className="text-base leading-relaxed text-body-color">
                    Leave behind more than photos. Share your values, life lessons, and the little things that make you who you are. 
                    Your children will always have access to your guidance and love.
                  </p>
                </div>
              </div>
            </div>

            {/* For Grandparents */}
            <div className="wow fadeInUp group" data-wow-delay=".15s">
              <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-gray-dark">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 opacity-20"></div>
                <div className="relative">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200 text-2xl" role="img" aria-label="grandparents">
                    👴👵
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-black dark:text-white">
                    For Grandparents
                  </h3>
                  <p className="text-base leading-relaxed text-body-color">
                    Preserve family history and traditions. Share stories from your childhood, family recipes, and wisdom gained over a lifetime. 
                    Future generations will know where they came from.
                  </p>
                </div>
              </div>
            </div>

            {/* For Families */}
            <div className="wow fadeInUp group" data-wow-delay=".2s">
              <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-gray-dark">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 opacity-20"></div>
                <div className="relative">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-2xl" role="img" aria-label="heart">
                    💕
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-black dark:text-white">
                    For Every Family
                  </h3>
                  <p className="text-base leading-relaxed text-body-color">
                    Whether biological, adoptive, chosen, or blended - every family has love worth preserving. 
                    Create a lasting connection that transcends time and distance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Features />

      {/* Emotional Reassurance Section */}
      <section 
        className="py-16 md:py-20 lg:py-28 bg-gradient-to-b from-purple-50/30 to-white dark:from-gray-dark dark:to-gray-dark"
        aria-labelledby="trust-heading"
      >
        <div className="container">
          <div className="mx-auto max-w-[800px] text-center">
            <h2 id="trust-heading" className="mb-4 text-3xl font-bold !leading-tight text-black dark:text-white sm:text-4xl md:text-[45px]">
              A Special Space for Your Story
            </h2>
            <p className="mb-12 text-base !leading-relaxed text-body-color md:text-lg">
              We understand the profound nature of preserving memories. Echos Of Me provides a gentle, 
              supportive environment where you can share at your own pace, knowing every word is treated with the reverence it deserves.
            </p>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3" role="list" aria-label="Trust and security features">
              <div className="wow fadeInUp" data-wow-delay=".1s" role="listitem">
                <div className="rounded-lg bg-white/50 p-6 backdrop-blur dark:bg-gray-dark/50">
                  <div className="mb-3 text-3xl" role="img" aria-label="security lock">🔒</div>
                  <h4 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Private & Secure
                  </h4>
                  <p className="text-sm text-body-color">
                    Your memories are encrypted and protected. Only those you choose can access your legacy.
                  </p>
                </div>
              </div>
              
              <div className="wow fadeInUp" data-wow-delay=".15s" role="listitem">
                <div className="rounded-lg bg-white/50 p-6 backdrop-blur dark:bg-gray-dark/50">
                  <div className="mb-3 text-3xl" role="img" aria-label="dove">🕊️</div>
                  <h4 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Gentle Process
                  </h4>
                  <p className="text-sm text-body-color">
                    Share your story through thoughtful questions designed to honor your experiences.
                  </p>
                </div>
              </div>
              
              <div className="wow fadeInUp" data-wow-delay=".2s" role="listitem">
                <div className="rounded-lg bg-white/50 p-6 backdrop-blur dark:bg-gray-dark/50">
                  <div className="mb-3 text-3xl" role="img" aria-label="gift">💝</div>
                  <h4 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Lasting Legacy
                  </h4>
                  <p className="text-sm text-body-color">
                    Your voice, wisdom, and love preserved forever for those who matter most.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}