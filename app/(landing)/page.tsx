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