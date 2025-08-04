'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UserMenuProps {
  onSettingsClick: () => void
}

export default function UserMenu({ onSettingsClick }: UserMenuProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/admin/analytics')
          setIsAdmin(response.ok)
        } catch (error) {
          setIsAdmin(false)
        }
      }
    }
    checkAdminStatus()
  }, [session])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowUserMenu(!showUserMenu)
        }}
        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mobile-tap-target rounded-md"
      >
        <span className="hidden sm:inline">Welcome, {session?.user?.name}</span>
        <span className="sm:hidden text-lg">👤</span>
        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showUserMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[60] mobile-safe-content">
          <div className="py-1">
            <button
              onClick={() => {
                onSettingsClick()
                setShowUserMenu(false)
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 mobile-tap-target"
            >
              ⚙️ Account Settings
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  router.push('/admin')
                  setShowUserMenu(false)
                }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 mobile-tap-target"
              >
                🔧 Admin Dashboard
              </button>
            )}
            <hr className="my-1" />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 mobile-tap-target"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}