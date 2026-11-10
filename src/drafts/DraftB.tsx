// Draft B — « Back-office » : bleu encre, menu latéral, raccourcis de période, tableaux denses.
// L'accent ambre ne sert qu'à la sélection.
import { useState, type ReactNode } from 'react'
import { CumulativeChart, MonthlyBars } from './charts'
import { SportIcon, PlusIcon } from './icons'
import { TokenSheet } from './TokenSheet'
import { TOKENS_B } from './tokens'
import {
  TOTAL, YEARS, BEST_YEAR, CUMULATIVE, MONTHS, BETS, RANKING, CALC, OPEN, SPORTS,
  eur0, pct, odd, fmtDate, profit, type FakeBet,
} from './fakeData'
import type { Screen } from './DraftsPage'

const Muted = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={className} style={{ color: 'var(--d-muted)' }}>{children}</span>

function Ico({ d }: { d: string }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Cell({ hdp, pr, selected, onPick }: { hdp?: string; pr: number; selected: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} className="num flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px]"
      style={{ border: `1px solid ${selected ? 'var(--d-accent)' : 'var(--d-grid)'}`, background: selected ? 'rgb(233 185 73 / 0.08)' : 'var(--d-bg)' }}>
      <Muted>{hdp ?? 'Vainq.'}</Muted><span className="font-semibold">{odd(1 / pr)}</span><Muted className="text-[11px]">{pct(pr, false, 0)}</Muted>
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[92px_1fr] items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--d-grid)' }}>
      <span className="text-xs" style={{ color: 'var(--d-muted)' }}>{label}</span>{children}
    </label>
  )
}

function Signed({ v }: { v: number }) {
  return <span className="num" style={{ color: v > 0 ? 'var(--d-win)' : v < 0 ? 'var(--d-loss)' : 'var(--d-ink)' }}>{eur0(v, true)}</span>
}

function resultLabel(b: FakeBet) {
  const won = b.result === 'Gagnant' || b.result === '1/2 Gagnant', lost = b.result === 'Perdant' || b.result === '1/2 Perdant'
  return <span className="text-xs" style={{ color: won ? 'var(--d-win)' : lost ? 'var(--d-loss)' : 'var(--d-muted)' }}>{won ? '▲ ' : lost ? '▼ ' : '○ '}{b.result}</span>
}

const NAV: { section: string; items: string[] }[] = [
  { section: 'Paris', items: ['Journal', 'Bilan', 'Partage & compta', 'Vu pas pris'] },
  { section: 'Modèles', items: ['Ligues', 'Calculateurs'] },
  { section: 'Kelicful', items: ['Bilan perso', 'Elo ATP', 'Elo WTA'] },
  { section: 'Réglages', items: [] },
]

function Shell({ active, title, children, actions }: { active: string; title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="draft-root draft-b flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 px-3 py-5 md:flex" style={{ borderRight: '1px solid var(--d-grid)' }}>
        <div className="px-3 text-lg font-semibold tracking-tight">BPB <Muted className="font-normal">paris</Muted></div>
        <nav className="space-y-5 text-[13px]">
          {NAV.map(g => (
            <div key={g.section}>
              <div className="mb-1 px-3 text-[11px] uppercase tracking-[0.1em]" style={{ color: 'var(--d-muted)' }}>{g.section}</div>
              {g.items.map(i => (
                <div key={i} data-on={i === active} className="b-nav rounded-md px-3 py-1.5" style={{ color: i === active ? undefined : 'var(--d-muted)' }}>{i}</div>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 px-3 text-xs"><span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--d-surface-2)' }}>SQ</span> Squawo</div>
      </aside>
      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        <header className="flex items-center gap-3 px-4 py-4 md:px-6" style={{ borderBottom: '1px solid var(--d-grid)' }}>
          <span className="md:hidden" aria-hidden><svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <button className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium md:flex" style={{ background: 'var(--d-ink)', color: 'var(--d-bg)' }}><PlusIcon size={15} /> Pari</button>
          </div>
        </header>
        {children}
      </div>
      <button aria-label="Nouveau pari" className="fixed bottom-5 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full md:hidden" style={{ background: 'var(--d-ink)', color: 'var(--d-bg)' }}><PlusIcon size={22} /></button>
    </div>
  )
}

function PeriodBar() {
  const [p, setP] = useState('Tout')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="b-input num hidden px-3 py-1.5 text-xs lg:block">01/01/2024 – 10/11/2026</div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {["Aujourd'hui", 'Cette semaine', 'Ce mois', '2024', '2025', '2026', 'Tout'].map(x => (
          <button key={x} data-on={p === x} onClick={() => setP(x)} className="b-pill shrink-0 px-3 py-1.5 text-xs">{x}</button>
        ))}
      </div>
    </div>
  )
}

function KpiBand() {
  const items = [
    ['Bénéfice', <Signed v={TOTAL.pl} />, 'paris + ajustements'],
    ['Misé', <span className="num">{eur0(TOTAL.staked)}</span>, `${TOTAL.n} paris réglés`],
    ['ROI', <span className="num">{pct(TOTAL.roi, true)}</span>, 'bénéfice ÷ misé'],
    ['Réussite', <span className="num">{pct(TOTAL.hit, false)}</span>, `${TOTAL.wins} gagnants`],
    ['CLV moyen', <span className="num">{pct(TOTAL.clv, true)}</span>, `${pct(TOTAL.clvPos, false, 0)} à CLV +`],
    ['Cote moyenne', <span className="num">{odd(TOTAL.avgOdds)}</span>, `mise moy. ${eur0(TOTAL.avgStake)}`],
  ] as const
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden md:grid-cols-3 xl:grid-cols-6" style={{ background: 'var(--d-grid)', border: '1px solid var(--d-grid)', borderRadius: 'var(--d-radius)' }}>
      {items.map(([l, v, s]) => (
        <div key={l} className="px-4 py-3.5" style={{ background: 'var(--d-surface)' }}>
          <div className="text-xs" style={{ color: 'var(--d-muted)' }}>{l}</div>
          <div className="mt-1 text-[22px] font-semibold leading-tight md:text-[26px]">{v}</div>
          <div className="text-[11px]" style={{ color: 'var(--d-muted)' }}>{s}</div>
        </div>
      ))}
    </section>
  )
}

function Toolbar({ density, setDensity }: { density: 'dense' | 'normal'; setDensity: (d: 'dense' | 'normal') => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 text-[13px]" style={{ borderBottom: '1px solid var(--d-grid)' }}>
      <button className="b-tool flex items-center gap-1.5 px-2.5 py-1.5"><Ico d="M5 4v16M12 4v16M19 4v16" />Colonnes</button>
      <button className="b-tool flex items-center gap-1.5 px-2.5 py-1.5"><Ico d="M4 5h16l-6 7v6l-4 2v-8Z" />Filtres</button>
      <button className="b-tool flex items-center gap-1.5 px-2.5 py-1.5" onClick={() => setDensity(density === 'dense' ? 'normal' : 'dense')}><Ico d="M4 6h16M4 12h16M4 18h16" />Densité : {density === 'dense' ? 'serrée' : 'normale'}</button>
      <button className="b-tool flex items-center gap-1.5 px-2.5 py-1.5"><Ico d="M12 4v11M7 10l5 5 5-5M5 20h14" />Export CSV</button>
      <input className="b-input ml-auto w-full px-3 py-1.5 text-xs sm:w-56" placeholder="Rechercher un match, une position…" />
    </div>
  )
}

function Bilan() {
  const [density, setDensity] = useState<'dense' | 'normal'>('dense')
  const [mode, setMode] = useState<'continu' | 'superpose'>('continu')
  const [sel, setSel] = useState<number | null>(2026)
  const py = density === 'dense' ? 'py-1.5' : 'py-3'
  return (
    <Shell active="Bilan" title="Bilan commun">
      <main className="space-y-4 px-4 py-4 md:px-6">
        <PeriodBar />
        <p className="text-sm" style={{ color: 'var(--d-muted)' }}>
          Depuis janvier 2024, <span style={{ color: 'var(--d-ink)' }}>{TOTAL.n} paris</span> ont rapporté <Signed v={TOTAL.pl} /> pour <span className="num" style={{ color: 'var(--d-ink)' }}>{eur0(TOTAL.staked)}</span> misés (ROI <span className="num" style={{ color: 'var(--d-ink)' }}>{pct(TOTAL.roi, true)}</span>). Meilleure année : {BEST_YEAR.year}.
        </p>
        <KpiBand />
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="b-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Bénéfice cumulé</h2>
              <div className="flex gap-1">{(['continu', 'superpose'] as const).map(m => <button key={m} data-on={mode === m} onClick={() => setMode(m)} className="b-pill px-2.5 py-1 text-xs">{m === 'continu' ? 'Continu' : 'Superposé'}</button>)}</div>
            </div>
            <CumulativeChart points={CUMULATIVE} mode={mode} height={240} />
          </section>
          <section className="b-panel overflow-hidden">
            <h2 className="px-4 pt-4 text-sm font-semibold">Année par année</h2>
            <table className="b-table num mt-2 w-full text-[13px]">
              <thead><tr><th className="px-4 py-2">Année</th><th className="text-right">Paris</th><th className="text-right">Misé</th><th className="text-right">Bénéfice</th><th className="px-4 text-right">ROI</th></tr></thead>
              <tbody>
                {YEARS.map(y => (
                  <tr key={y.year} data-sel={sel === y.year} onClick={() => setSel(y.year)} className="cursor-pointer">
                    <td className="px-4 py-2" style={{ boxShadow: sel === y.year ? 'inset 2px 0 0 var(--d-accent)' : undefined }}>{y.year}</td>
                    <td className="text-right">{y.n}</td><td className="text-right">{eur0(y.staked)}</td><td className="text-right"><Signed v={y.pl} /></td><td className="px-4 text-right">{pct(y.roi, true)}</td>
                  </tr>
                ))}
                <tr><td className="px-4 py-2 font-semibold">Total</td><td className="text-right">{TOTAL.n}</td><td className="text-right">{eur0(TOTAL.staked)}</td><td className="text-right font-semibold"><Signed v={TOTAL.pl} /></td><td className="px-4 text-right font-semibold">{pct(TOTAL.roi, true)}</td></tr>
              </tbody>
            </table>
          </section>
        </div>
        <section className="b-panel p-4">
          <h2 className="mb-2 text-sm font-semibold">Bénéfice par mois</h2>
          <MonthlyBars months={MONTHS} height={170} />
        </section>
        <section className="b-panel overflow-hidden">
          <Toolbar density={density} setDensity={setDensity} />
          <div className="overflow-x-auto">
            <table className="b-table w-full min-w-[820px] text-[13px]">
              <thead><tr>
                <th className="px-4 py-2">Date</th><th>Sport</th><th>Position</th><th>Match</th><th className="text-right">Mise</th><th className="text-right">Cote</th><th className="text-right">Clôture</th><th className="pl-4">Résultat</th><th className="px-4 text-right">Bénéfice</th>
              </tr></thead>
              <tbody>
                {[...BETS].reverse().slice(0, 14).map(b => (
                  <tr key={b.id}>
                    <td className={`num px-4 ${py}`} style={{ color: 'var(--d-muted)' }}>{fmtDate(b.date)}</td>
                    <td style={{ color: 'var(--d-muted)' }}><SportIcon sport={b.sport} size={15} /></td>
                    <td className="font-medium">{b.selection}</td>
                    <td style={{ color: 'var(--d-muted)' }}>{b.game}</td>
                    <td className="num text-right">{eur0(b.stake)}</td>
                    <td className="num text-right">{odd(b.odds)}</td>
                    <td className="num text-right" style={{ color: 'var(--d-muted)' }}>{b.closing ? odd(b.closing) : '—'}</td>
                    <td className="pl-4">{resultLabel(b)}</td>
                    <td className="px-4 text-right">{b.result === 'En cours' ? <Muted>—</Muted> : <Signed v={profit(b)} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ color: 'var(--d-muted)' }}><span>1–14 sur {BETS.length}</span><span>‹ Précédent · Suivant ›</span></div>
        </section>
      </main>
    </Shell>
  )
}

function Modeles() {
  const { a, b, delta, p, sa, sb } = CALC
  const [pick, setPick] = useState('bo3M15-a')
  const rows: [string, string, string | undefined, number, string | undefined, number][] = [
    ['BO3', 'bo3Win', undefined, sa.bo3Win, undefined, sb.bo3Win],
    ['', 'bo3M15', '−1.5', sa.bo3M15, '+1.5', sb.bo3P15],
    ['', 'bo3P15', '+1.5', sa.bo3P15, '−1.5', sb.bo3M15],
    ['BO5', 'bo5Win', undefined, sa.bo5Win, undefined, sb.bo5Win],
    ['', 'bo5M15', '−1.5', sa.bo5M15, '+1.5', sb.bo5P15],
    ['', 'bo5P15', '+1.5', sa.bo5P15, '−1.5', sb.bo5M15],
    ['', 'bo5M25', '−2.5', sa.bo5M25, '+2.5', sb.bo5P25],
    ['', 'bo5P25', '+2.5', sa.bo5P25, '−2.5', sb.bo5M25],
  ]
  return (
    <Shell active="Ligues" title="Modèles · LEC SU26" actions={<div className="hidden gap-1 lg:flex">{['Classement', 'GDM', 'Matchs', 'Équipes'].map((t, i) => <span key={t} data-on={i === 1} className="b-pill px-3 py-1.5 text-xs">{t}</span>)}</div>}>
      <main className="space-y-4 px-4 py-4 md:px-6">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
          {['LEC SU26', 'LCK SU26', 'LPL SU26', 'LCS SU26', 'EMEA SU26', 'Worlds 2026', 'Demacia Cup'].map((l, i) => <span key={l} data-on={i === 0} className="b-pill shrink-0 px-3 py-1.5 text-xs">{l}</span>)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="b-panel overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--d-grid)' }}>
              <h2 className="text-sm font-semibold">Classement Elo GDM</h2><Muted className="text-xs">depuis le 29/07 · 10 équipes</Muted>
            </div>
            <div className="overflow-x-auto">
              <table className="b-table num w-full min-w-[640px] text-[13px]">
                <thead><tr><th className="px-4 py-2">#</th><th>Équipe</th><th className="text-right">Entrée</th><th className="text-right">GDM</th><th className="text-right">GD@15</th><th className="text-right">Games</th><th className="text-right">Perf</th><th className="px-4 text-right">Sortie</th></tr></thead>
                <tbody>
                  {RANKING.map((r, i) => {
                    const d = r.output - r.input
                    return (
                      <tr key={r.name}>
                        <td className="px-4 py-2" style={{ color: 'var(--d-muted)' }}>{i + 1}</td>
                        <td><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold" style={{ background: 'var(--d-surface-2)' }}>{r.initials}</span><span style={{ fontFamily: 'var(--d-font-body)' }}>{r.name}</span></td>
                        <td className="text-right" style={{ color: 'var(--d-muted)' }}>{r.input}</td>
                        <td className="text-right" style={{ color: r.gdm >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{r.gdm > 0 ? '+' : r.gdm < 0 ? '−' : ''}{Math.abs(r.gdm)}</td>
                        <td className="text-right" style={{ color: 'var(--d-muted)' }}>{r.gd15 > 0 ? '+' : r.gd15 < 0 ? '−' : ''}{Math.abs(r.gd15)}</td>
                        <td className="text-right">{r.games}</td>
                        <td className="text-right">{r.perf}</td>
                        <td className="px-4 text-right"><span className="font-semibold">{r.output}</span> <span className="text-[11px]" style={{ color: d >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{d >= 0 ? '+' : '−'}{Math.abs(d)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="b-panel p-4">
            <h2 className="text-sm font-semibold">Calculateur de cotes</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[a, b].map(t => <div key={t.name} className="b-input flex items-center justify-between px-3 py-2 text-sm"><span>{t.name}</span><span className="num" style={{ color: 'var(--d-muted)' }}>{t.output}</span></div>)}
            </div>
            <div className="num mt-3 grid grid-cols-3 items-end text-center">
              <div><div className="text-2xl font-semibold">{pct(p, false)}</div><Muted className="text-xs">BO1 {odd(1 / p)}</Muted></div>
              <div><Muted className="text-xs">Δ Elo</Muted><div className="text-sm">{delta > 0 ? '+' : ''}{delta}</div><Muted className="text-xs">s = 40</Muted></div>
              <div><div className="text-2xl font-semibold">{pct(1 - p, false)}</div><Muted className="text-xs">BO1 {odd(1 / (1 - p))}</Muted></div>
            </div>
            <table className="mt-4 w-full text-[13px]">
              <thead><tr className="text-xs" style={{ color: 'var(--d-muted)' }}><th className="w-12 pb-1.5 text-left font-medium">Format</th><th className="pb-1.5 text-left font-medium">{a.name}</th><th className="pb-1.5 text-left font-medium">{b.name}</th></tr></thead>
              <tbody>
                {rows.map(([fmt, key, ha, pa, hb, pb]) => (
                  <tr key={key} style={{ borderTop: fmt ? '1px solid var(--d-grid)' : undefined }}>
                    <td className="py-1 pr-2 align-middle text-xs font-semibold" style={{ color: 'var(--d-muted)' }}>{fmt}</td>
                    <td className="py-1 pr-1"><Cell hdp={ha} pr={pa} selected={pick === `${key}-a`} onPick={() => setPick(`${key}-a`)} /></td>
                    <td className="py-1 pl-1"><Cell hdp={hb} pr={pb} selected={pick === `${key}-b`} onPick={() => setPick(`${key}-b`)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-3 w-full rounded-md py-2 text-sm font-medium" style={{ border: '1px solid var(--d-grid)' }}>Prendre la cote sélectionnée →</button>
          </section>
        </div>
      </main>
    </Shell>
  )
}

function Pari() {
  const [sport, setSport] = useState('E-sport')
  const [res, setRes] = useState<Record<number, string>>({})
  return (
    <Shell active="Journal" title="Journal">
      <main className="grid gap-4 px-4 py-4 md:px-6 lg:grid-cols-[420px_1fr]">
        <section className="b-panel p-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Nouveau pari</h2><Muted className="num text-xs">10/11/2026</Muted></div>
          <div className="mt-2">
            <Field label="Match"><input className="b-input px-2.5 py-2 text-sm" defaultValue="Nordlys vs Halcyon" /></Field>
            <Field label="Position"><input className="b-input px-2.5 py-2 text-sm" defaultValue="Nordlys -1.5" /></Field>
            <Field label="Sport">
              <div className="flex gap-1 overflow-x-auto">{SPORTS.slice(0, 5).map(s => (
                <button key={s} data-on={sport === s} onClick={() => setSport(s)} className="b-pill flex shrink-0 items-center gap-1 px-2 py-1.5 text-xs" title={s}><SportIcon sport={s} size={14} />{sport === s && s}</button>
              ))}</div>
            </Field>
            <Field label="Marché"><span className="text-sm">Handicap <Muted className="text-xs">(déduit)</Muted></span></Field>
            <div className="grid grid-cols-2 gap-3 py-2" style={{ borderBottom: '1px solid var(--d-grid)' }}>
              <label><span className="text-xs" style={{ color: 'var(--d-muted)' }}>Mise €</span><input className="b-input num mt-1 w-full px-2.5 py-2 text-lg" defaultValue="200" inputMode="decimal" /></label>
              <label><span className="text-xs" style={{ color: 'var(--d-muted)' }}>Cote</span><input className="b-input num mt-1 w-full px-2.5 py-2 text-lg" defaultValue="1.85" inputMode="decimal" /></label>
            </div>
            <Field label="Portefeuille"><div className="flex gap-1">{['Commun', 'Kelicful'].map((x, i) => <span key={x} data-on={i === 0} className="b-pill px-3 py-1.5 text-xs">{x}</span>)}</div></Field>
            <Field label="Statut"><div className="flex gap-1">{['Pris', 'Vu pas pris'].map((x, i) => <span key={x} data-on={i === 0} className="b-pill px-3 py-1.5 text-xs">{x}</span>)}</div></Field>
            <div className="py-2 text-xs" style={{ color: 'var(--d-muted)' }}>▸ Plus : clôture, ligue, placé par, part Squawo, note</div>
          </div>
          <div className="mt-2 flex gap-2">
            <button className="flex-1 rounded-md py-2.5 text-sm font-semibold" style={{ background: 'var(--d-ink)', color: 'var(--d-bg)' }}>Enregistrer</button>
            <button className="rounded-md px-3 py-2.5 text-sm" style={{ border: '1px solid var(--d-grid)' }}>Dupliquer</button>
          </div>
        </section>
        <section className="b-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--d-grid)' }}>
            <h2 className="text-sm font-semibold">En cours <Muted className="font-normal">· {OPEN.length + 2}</Muted></h2>
            <Muted className="num text-xs">Squawo 310 € · Kelicful 420 €</Muted>
          </div>
          {[...OPEN, { ...BETS[BETS.length - 6], id: 9001, result: 'En cours' as const }, { ...BETS[BETS.length - 9], id: 9002, result: 'En cours' as const, placedBy: 'Kelicful' as const }].map(b => (
            <div key={b.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--d-grid)' }}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0"><div className="truncate text-sm font-medium">{b.selection}</div><Muted className="block truncate text-xs">{b.game} · {b.placedBy}</Muted></div>
                <div className="num shrink-0 text-right text-sm"><span className="font-semibold">{odd(b.odds)}</span> <Muted>· {eur0(b.stake)}</Muted></div>
              </div>
              <div className="mt-2 grid grid-cols-5 overflow-hidden rounded-md text-xs" style={{ border: '1px solid var(--d-grid)' }}>
                {['Gagnant', 'Perdant', '½ G', '½ P', 'Remb.'].map((x, i) => (
                  <button key={x} onClick={() => setRes(r => ({ ...r, [b.id]: x }))} className="py-2"
                    style={{ borderLeft: i ? '1px solid var(--d-grid)' : undefined, background: res[b.id] === x ? 'rgb(233 185 73 / 0.12)' : undefined, color: res[b.id] === x ? 'var(--d-accent)' : 'var(--d-muted)' }}>{x}</button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </Shell>
  )
}

export function DraftB({ screen }: { screen: Screen }) {
  if (screen === 'tokens') return <div className="draft-root draft-b"><TokenSheet t={TOKENS_B} /></div>
  return screen === 'bilan' ? <Bilan /> : screen === 'modeles' ? <Modeles /> : <Pari />
}
