// Coque « Hybride » : en-tête (sections, Style Suisse | Bourse, Mode clair | sombre, Pari +),
// bandeau des derniers paris en style Bourse, sous-navigation de la section, contenu sur une grille commune.
// Ni le style ni le mode ne changent la mise en page.
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { League } from '@/types'
import type { Bet } from '@/types/betting'
import { useAppearance } from '@/lib/appearance'
import { useTabLayout } from '@/lib/tabLayout'
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
  '/paris': [{ label: 'Bilan', to: '/paris/bilan' }, { label: 'Récap', to: '/paris/recap' }, { label: 'Partage & compta', to: '/paris/partage' }, { label: 'Calculateurs', to: '/paris/calculateurs' }],
  '/kelicful': [{ label: 'Bilan', to: '/kelicful/bilan' }, { label: 'Récap', to: '/kelicful/recap' }, { label: 'Vu pas pris', to: '/kelicful/vu-pas-pris' }, { label: 'Elo ATP', to: '/kelicful/atp' }, { label: 'Elo WTA', to: '/kelicful/wta' }],
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

/** Contrôles discrets d'un onglet en mode personnalisation : déplacer (‹ ›) et masquer / afficher. */
function TabTools({ first, last, hidden, canHide = true, onMove, onToggle, label }: { first: boolean; last: boolean; hidden: boolean; canHide?: boolean; onMove: (d: -1 | 1) => void; onToggle: () => void; label: string }) {
  const btn = 'px-1 text-[11px] leading-none text-faint hover:text-ink disabled:opacity-30'
  return (
    <span className="ml-1 inline-flex items-center">
      <button type="button" className={btn} disabled={first} onClick={() => onMove(-1)} aria-label={`Déplacer ${label} vers la gauche`}>‹</button>
      <button type="button" className={btn} disabled={last} onClick={() => onMove(1)} aria-label={`Déplacer ${label} vers la droite`}>›</button>
      {canHide && <button type="button" className={btn} onClick={onToggle} aria-label={hidden ? `Afficher ${label}` : `Masquer ${label}`}>{hidden ? 'afficher' : 'masquer'}</button>}
    </span>
  )
}

const Sun = () => <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></g></svg>
const Moon = () => <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>

/** Bandeau défilant des derniers paris réglés (style Bourse) : ceux de Kelicful dans son espace, les paris communs ailleurs. */
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
  const tabs = useTabLayout(userId)
  const [editTabs, setEditTabs] = useState(false)
  const sections = tabs.sort(SECTIONS, s => s.base)
  const shownSections = sections.filter(s => editTabs || !tabs.isHidden(s.base))
  const subOf = (base: string) => tabs.sort(SUB[base] ?? [], t => t.to)
  const sub = subOf(section)
  const shownSub = sub.filter(t => editTabs || !tabs.isHidden(t.to))
  // Lien d'une section : son premier sous-onglet visible
  const sectionHref = (s: typeof SECTIONS[number]) => subOf(s.base).find(t => !tabs.isHidden(t.to))?.to ?? s.to

  // Logo d'onglet : minimap rouge sur les sections communes, ambre dans l'espace Kelicful
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link) link.href = `${import.meta.env.BASE_URL}${section === '/kelicful' ? 'favicon-kelicful.svg' : 'favicon.svg'}`
  }, [section])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-ink py-3">
          <Link to="/paris/bilan" className="shrink-0 text-[15px] font-bold tracking-tight">Squawo &amp; Kelicful</Link>
          <nav className="-mx-1 flex overflow-x-auto" aria-label="Sections">
            {shownSections.map((s, i) => (
              <span key={s.base} className={`flex shrink-0 items-center ${editTabs && tabs.isHidden(s.base) ? 'opacity-40' : ''}`}>
                <NavLink to={sectionHref(s)} className={`px-2 py-1 text-[15px] ${section === s.base ? 'text-nav' : 'text-ink hover:text-nav'} ${editTabs && tabs.isHidden(s.base) ? 'line-through' : ''}`}>{s.label}</NavLink>
                {editTabs && <TabTools label={s.label} first={i === 0} last={i === sections.length - 1} hidden={tabs.isHidden(s.base)} canHide={s.base !== '/reglages'}
                  onMove={d => tabs.move(sections.map(x => x.base), s.base, d)} onToggle={() => tabs.toggle(s.base)} />}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Segmented label="Style" value={style} onChange={setStyle} options={[{ v: 'suisse', content: 'Suisse', title: 'Style Suisse' }, { v: 'terminal', content: 'Bourse', title: 'Style Bourse' }]} />
            <Segmented label="Mode" value={mode} onChange={setMode} options={[{ v: 'clair', content: <Sun />, title: 'Mode clair' }, { v: 'sombre', content: <Moon />, title: 'Mode sombre' }]} />
            <Link to={newBetHref} className="btn-primary hidden h-8 items-center px-3.5 text-[13px] md:flex">Pari +</Link>
          </div>
        </header>

        {style === 'terminal' && <Ticker bets={bets} portfolio={section === '/kelicful' ? 'kelicful' : 'commun'} />}

        {editTabs && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-1.5 text-[11px] text-faint">
            <span>Personnalisation des onglets : ‹ › pour déplacer, « masquer » pour retirer de la barre (la page reste accessible).</span>
            {tabs.customized && <button onClick={tabs.reset} className="underline underline-offset-2 hover:text-ink">Tout réinitialiser</button>}
            <button onClick={() => setEditTabs(false)} className="ml-auto font-semibold text-ink">Terminé</button>
          </div>
        )}

        {((SUB[section] && shownSub.length > 0) || section === '/modeles') && (
          <nav className="flex items-center gap-x-5 gap-y-1 overflow-x-auto border-b border-line py-2 text-[13px]" aria-label="Sous-sections">
            {section === '/modeles'
              ? <LeagueNav leagues={leagues} />
              : shownSub.map((s, i) => (
                <span key={s.to} className={`flex shrink-0 items-center ${editTabs && tabs.isHidden(s.to) ? 'opacity-40' : ''}`}>
                  <NavLink to={s.to} className={({ isActive }) => `py-1 ${isActive ? 'font-semibold text-ink' : 'text-muted hover:text-ink'} ${editTabs && tabs.isHidden(s.to) ? 'line-through' : ''}`}>{s.label}</NavLink>
                  {editTabs && <TabTools label={s.label} first={i === 0} last={i === sub.length - 1} hidden={tabs.isHidden(s.to)}
                    onMove={d => tabs.move(sub.map(x => x.to), s.to, d)} onToggle={() => tabs.toggle(s.to)} />}
                </span>
              ))}
          </nav>
        )}

        <div className="shell-main pb-24 md:pb-12">{children}</div>

        <footer className="flex items-center justify-between border-t border-line py-4 text-xs text-muted">
          <span>Squawo &amp; Kelicful{who ? ` · ${who}` : ''}</span>
          <span className="flex items-center gap-4">
            <button onClick={() => setEditTabs(e => !e)} className="text-faint hover:text-ink">{editTabs ? 'Terminer la personnalisation' : 'Personnaliser les onglets'}</button>
            <button onClick={() => supabase.auth.signOut()} className="hover:text-ink">Déconnexion</button>
          </span>
        </footer>
      </div>

      <Link to={newBetHref} aria-label="Nouveau pari" className="btn-primary fixed bottom-5 right-4 z-30 flex h-12 items-center px-4 text-sm md:hidden">Pari +</Link>
      <Toaster />
    </div>
  )
}
