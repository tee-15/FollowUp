'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutUser } from '@/app/actions/auth'

const NAVIGATION = [
  { name: 'Today', href: '/dashboard', icon: '🏠', description: 'Follow-ups due' },
  { name: 'New Reminder', href: '/reminders/new', icon: '➕', description: 'Add from chat, photo, voice' },
  { name: 'All Reminders', href: '/reminders', icon: '📋', description: 'View all' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await logoutUser()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900">
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-white/90 backdrop-blur-xl border-r border-gray-200/50 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/20">
              F
            </div>
            <div>
              <span className="text-base font-black text-gray-900 tracking-tight block leading-tight">FollowUp</span>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">AI</span>
            </div>
          </div>
          <button
            className="lg:hidden p-1 text-gray-400 hover:text-gray-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {NAVIGATION.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <span className="font-bold block truncate">{item.name}</span>
                  <span className={`text-[11px] block truncate ${isActive ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {item.description}
                  </span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <span>🚪</span>
            <span className="font-semibold">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-xs">F</div>
            <span className="text-sm font-black text-gray-900">FollowUp <span className="text-blue-500">AI</span></span>
          </div>
          <Link
            href="/reminders/new"
            className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm"
          >
            +
          </Link>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
