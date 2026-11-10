// Coque « Hybride » : en-tête (sections, Style Suisse | Terminal, Mode clair | sombre, Pari +),
// bandeau des derniers paris en style Terminal, sous-navigation de la section, contenu sur une grille commune.
// Ni le style ni le mode ne changent la mise en page.
import type { ReactNode } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { League } from '@/types'
import type { Bet } from '@/types/betting'
import { useAppearance } from '@/lib/appearance'
import { resultProfit, isSettled } from '@/lib/betStats'
import { LeagueNav } from './LeagueNav'
import { Toaster } from './Toaster'

const SECTIONS = [
  { label: 'Paris', base: '/paris', to: '/paris/bilan' },
  { label: 'Modèles', base: '/modeles', to: '/modeles' },
  { label: 'Kelicful', base: '/kelicful', to: '/kelicful/bilan' },
  { label: 'Réglages', base: '/reglages', to: '/reglages' },
]
const SUB: Record<string, { label: string; to: string }[]> = {
  '/paris': [{ label: 'Bilan', to: '/paris/bilan' }, { label: 'Journal', to: '/paris/journal' }, { label: 'Partage & compta', to: '/paris/partage' }, { label: 'Vu pas pris', to: '/paris/vu-pas-pris' }],
  '/kelicful': [{ label: 'Bilan perso', to: '/kelicful/bilan' }, { label: 'Elo ATP', to: '/kelicful/atp' }, { label: 'Elo WTA', to: '/kelicful/wta' }],
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; content: ReactNode; title: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex border border-ink">
      {options.map((o, i) => (
        <button key={o.v} onClick={() => onChange(o.v)} title={o.title} aria-pressed={value === o.v}
          className={`flex h-8 items-center justify-center px-2.5 text-[13px] font-semibold ${i ? 'border-l border-ink' : ''} ${value === o.v ? 'bg-ink text-bg' : 'text-ink hover:bg-raised'}`}>
          {o.content}
        </button>
      ))}
    </div>
  )
}

const Sun = () => <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></g></svg>
const Moon = () => <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>

/** Bandeau défilant des derniers paris réglés (style Terminal) : ceux de Kelicful dans son espace, les paris communs ailleurs. */
function Ticker({ bets, portfolio }: { bets: Bet[]; portfolio: 'commun' | 'kelicful' }) {
  const last = bets.filter(b => b.portfolio === portfolio && b.status === 'Pris' && isSettled(b.result))
    .sort((a, b) => b.bet_date.localeCompare(a.bet_date) || b.created_at.localeCompare(a.created_at)).slice(0, 14)
  if (!last.length) return null
  return (
    <div className="ticker border-b border-line py-2 font-mono text-[12px]" aria-label={portfolio === 'kelicful' ? 'Derniers paris de Kelicful' : 'Derniers paris communs'}>
      <div key={portfolio} className="ticker-track">
        {last.map(b => {
          const p = resultProfit(b)
          return (
            <span key={b.id} className={p >= 0 ? 'text-win' : 'text-loss'}>
              {p >= 0 ? '▲' : '▼'} {b.selection.toUpperCase()} @{Number(b.odds).toFixed(3)} {p >= 0 ? '+' : '−'}{Math.abs(p).toFixed(2)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function AppShell({ leagues, bets, userId, who, children }: { leagues: League[]; bets: Bet[]; userId: string; who?: string | null; children: ReactNode }) {
  const { pathname } = useLocation()
  const { style, mode, setStyle, setMode } = useAppearance(userId)
  const section = SECTIONS.find(s => pathname.startsWith(s.base))?.base ?? '/paris'
  const newBetHref = `${pathname}?pari=nouveau`

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-ink py-3">
          <Link to="/paris/bilan" className="shrink-0 text-[15px] font-bold tracking-tight">Squawo &amp; Kelicful</Link>
          <nav className="-mx-1 flex overflow-x-auto" aria-label="Sections">
            {SECTIONS.map(s => (
              <NavLink key={s.base} to={s.to} className={`shrink-0 px-2 py-1 text-[15px] ${section === s.base ? 'text-accent' : 'text-ink hover:text-accent'}`}>{s.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Segmented label="Style" value={style} onChange={setStyle} options={[{ v: 'suisse', content: 'Suisse', title: 'Style Suisse' }, { v: 'terminal', content: 'Terminal', title: 'Style Terminal' }]} />
            <Segmented label="Mode" value={mode} onChange={setMode} options={[{ v: 'clair', content: <Sun />, title: 'Mode clair' }, { v: 'sombre', content: <Moon />, title: 'Mode sombre' }]} />
            <Link to={newBetHref} className="btn-primary hidden h-8 items-center px-3.5 text-[13px] md:flex">Pari +</Link>
          </div>
        </header>

        {style === 'terminal' && <Ticker bets={bets} portfolio={section === '/kelicful' ? 'kelicful' : 'commun'} />}

        {(SUB[section] || section === '/modeles') && (
          <nav className="flex items-center gap-x-5 gap-y-1 overflow-x-auto border-b border-line py-2 text-[13px]" aria-label="Sous-sections">
            {section === '/modeles'
              ? <LeagueNav leagues={leagues} />
              : SUB[section].map(s => (
                <NavLink key={s.to} to={s.to} className={({ isActive }) => `shrink-0 py-1 ${isActive ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>{s.label}</NavLink>
              ))}
          </nav>
        )}

        <div className="shell-main pb-24 md:pb-12">{children}</div>

        <footer className="flex items-center justify-between border-t border-line py-4 text-xs text-muted">
          <span>Squawo &amp; Kelicful{who ? ` · ${who}` : ''}</span>
          <button onClick={() => supabase.auth.signOut()} className="hover:text-ink">Déconnexion</button>
        </footer>
      </div>

      <Link to={newBetHref} aria-label="Nouveau pari" className="btn-primary fixed bottom-5 right-4 z-30 flex h-12 items-center px-4 text-sm md:hidden">Pari +</Link>
      <Toaster />
    </div>
  )
}
