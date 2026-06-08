import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface LayoutProps {
  children: ReactNode
  userEmail?: string
}

export function Layout({ children, userEmail }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(222 47% 11%)' }}>
      <header className="flex items-center justify-between px-6 py-3 border-b" style={{ background: 'hsl(222 47% 14%)', borderColor: 'hsl(216 34% 22%)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⚔️</span>
          <span className="font-bold text-white text-sm">LoL Stats 2026</span>
        </div>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>{userEmail}</span>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
          >
            Déconnexion
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
