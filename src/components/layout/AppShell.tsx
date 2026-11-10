// Coque de l'application (DA « Back-office ») : menu latéral sur ordinateur, tiroir sur mobile,
// bouton « + Pari » toujours accessible.
import { useState, type ReactNode } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { League } from '@/types'
import { LeagueNav } from './LeagueNav'
import { ThemeToggle } from './ThemeToggle'
import { Toaster } from './Toaster'

const SECTIONS: { title: string; base: string; items: { label: string; to: string }[] }[] = [
  { title: 'Paris', base: '/paris', items: [
    { label: 'Journal', to: '/paris/journal' },
    { label: 'Bilan', to: '/paris/bilan' },
    { label: 'Partage & compta', to: '/paris/partage' },
    { label: 'Vu pas pris', to: '/paris/vu-pas-pris' },
  ] },
  { title: 'Kelicful', base: '/kelicful', items: [
    { label: 'Bilan perso', to: '/kelicful/bilan' },
    { label: 'Elo ATP', to: '/kelicful/atp' },
    { label: 'Elo WTA', to: '/kelicful/wta' },
  ] },
]

function NavItem({ to, children, onNavigate }: { to: string; children: ReactNode; onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `block rounded-md px-3 py-1.5 text-[13px] ${isActive ? 'bg-raised text-ink shadow-[inset_2px_0_0_var(--color-accent)]' : 'text-muted hover:text-ink'}`}
    >
      {children}
    </NavLink>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-1 px-3 text-[11px] uppercase tracking-[0.1em] text-faint">{children}</div>
}

function Sidebar({ leagues, email, onNavigate }: { leagues: League[]; email?: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 px-3 py-5">
      <Link to="/modeles" onClick={onNavigate} className="px-3 text-lg font-semibold tracking-tight">BPB <span className="font-normal text-muted">paris</span></Link>
      <nav className="flex-1 space-y-5 overflow-y-auto">
        <div>
          <SectionTitle>Paris</SectionTitle>
          {SECTIONS[0].items.map(i => <NavItem key={i.to} to={i.to} onNavigate={onNavigate}>{i.label}</NavItem>)}
        </div>
        <div>
          <SectionTitle>Modèles</SectionTitle>
          <LeagueNav leagues={leagues} onNavigate={onNavigate} />
          <NavItem to="/modeles/calculateurs" onNavigate={onNavigate}>Calculateurs</NavItem>
        </div>
        <div>
          <SectionTitle>Kelicful</SectionTitle>
          {SECTIONS[1].items.map(i => <NavItem key={i.to} to={i.to} onNavigate={onNavigate}>{i.label}</NavItem>)}
        </div>
        <div>
          <NavItem to="/reglages" onNavigate={onNavigate}>Réglages</NavItem>
        </div>
      </nav>
      <div className="flex items-center gap-2 px-3 text-xs">
        <span className="min-w-0 flex-1 truncate text-muted">{email}</span>
        <button onClick={() => supabase.auth.signOut()} className="btn-ghost px-2.5 py-1">Déconnexion</button>
      </div>
    </div>
  )
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}

export function AppShell({ leagues, email, title, children }: { leagues: League[]; email?: string; title?: ReactNode; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const newBetHref = `${location.pathname}?pari=nouveau`

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-line md:block">
        <Sidebar leagues={leagues} email={email} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawer(false)} style={{ background: 'rgb(5 8 15 / 0.6)' }}>
          <aside className="h-full w-64 border-r border-line bg-bg" onClick={e => e.stopPropagation()}>
            <Sidebar leagues={leagues} email={email} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg px-4 py-3 md:px-6">
          <button className="md:hidden" aria-label="Ouvrir le menu" onClick={() => setDrawer(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
          <div className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight md:text-xl">{title}</div>
          <Link to={newBetHref} className="btn-primary hidden items-center gap-1.5 px-3 py-2 text-sm md:flex"><PlusIcon size={15} /> Pari</Link>
          <ThemeToggle />
        </header>
        {children}
      </div>

      <Link to={newBetHref} aria-label="Nouveau pari" className="btn-primary fixed bottom-5 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full md:hidden" style={{ borderRadius: 999 }}>
        <PlusIcon size={22} />
      </Link>
      <Toaster />
    </div>
  )
}
