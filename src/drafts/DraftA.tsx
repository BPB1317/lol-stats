// Draft A — « Terminal » : quasi noir, un seul accent vert acide, grotesque condensée, chiffres mono.
import { useState, type ReactNode } from 'react'
import { CumulativeChart, MonthlyBars } from './charts'
import { SportIcon, PlusIcon } from './icons'
import { TokenSheet } from './TokenSheet'
import { TOKENS_A } from './tokens'
import {
  TOTAL, YEARS, BEST_YEAR, CUMULATIVE, MONTHS, RECENT, RANKING, CALC, SPORTS, OPEN, UPCOMING,
  eur, eur0, pct, odd, fmtDate, profit, type FakeBet,
} from './fakeData'
import type { Screen } from './DraftsPage'

const Label = ({ children }: { children: ReactNode }) => (
  <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--d-muted)' }}>{children}</div>
)

function Signed({ v, className = '' }: { v: number; className?: string }) {
  return <span className={`num ${className}`} style={{ color: v > 0 ? 'var(--d-win)' : v < 0 ? 'var(--d-loss)' : 'var(--d-ink)' }}>{eur0(v, true)}</span>
}

function ResultTag({ b }: { b: FakeBet }) {
  const won = b.result === 'Gagnant' || b.result === '1/2 Gagnant'
  const lost = b.result === 'Perdant' || b.result === '1/2 Perdant'
  const cls = won ? 'a-tag-win' : lost ? 'a-tag-loss' : 'a-tag-open'
  const txt = { 'Gagnant': 'GAGNÉ', '1/2 Gagnant': '1/2 GAGNÉ', 'Perdant': 'PERDU', '1/2 Perdant': '1/2 PERDU', 'Remboursé': 'REMB.', 'En cours': 'EN COURS' }[b.result]
  return <span className={`${cls} num inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider`}>{txt}</span>
}

function Shell({ screen, children }: { screen: Screen; children: ReactNode }) {
  const nav = [['paris', 'Paris'], ['modeles', 'Modèles'], ['kelicful', 'Kelicful'], ['reglages', 'Réglages']] as const
  const active = screen === 'modeles' ? 'modeles' : 'paris'
  return (
    <div className="draft-root draft-a pb-24 md:pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-6 px-4 py-3 md:px-8" style={{ background: 'var(--d-bg)', borderBottom: '1px solid var(--d-grid)' }}>
        <div className="display text-2xl leading-none tracking-tight">BPB<span style={{ color: 'var(--d-accent)' }}>/</span>BETS</div>
        <nav className="hidden gap-1 md:flex">
          {nav.map(([k, l]) => (
            <span key={k} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: active === k ? 'var(--d-accent)' : 'var(--d-muted)' }}>{l}</span>
          ))}
        </nav>
        <button className="ml-auto hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold md:flex" style={{ background: 'var(--d-accent)', color: 'var(--d-accent-ink)' }}>
          <PlusIcon size={16} /> Pari
        </button>
        <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold md:ml-0" style={{ border: '1px solid var(--d-grid)' }}>SQ</div>
      </header>
      {children}
      {/* Mobile : barre d'onglets + bouton flottant */}
      <button aria-label="Nouveau pari" className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full md:hidden" style={{ background: 'var(--d-accent)', color: 'var(--d-accent-ink)' }}>
        <PlusIcon size={24} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 md:hidden" style={{ background: 'var(--d-surface)', borderTop: '1px solid var(--d-grid)' }}>
        {nav.map(([k, l]) => (
          <span key={k} className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: active === k ? 'var(--d-accent)' : 'var(--d-muted)' }}>{l}</span>
        ))}
      </nav>
    </div>
  )
}

function SportChips() {
  const [on, setOn] = useState<string>('Tous')
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {(['Tous', ...SPORTS] as const).map(s => (
        <button key={s} data-on={on === s} onClick={() => setOn(s)} className="a-chip flex shrink-0 items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider">
          <SportIcon sport={s} size={16} /> {s}
        </button>
      ))}
    </div>
  )
}

function Bilan() {
  const [mode, setMode] = useState<'continu' | 'superpose'>('continu')
  const [year, setYear] = useState<string>('Toutes')
  return (
    <main className="mx-auto max-w-[1360px] space-y-5 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>Paris · portefeuille commun</Label>
          <h1 className="display mt-1 text-5xl leading-[0.9] md:text-6xl">BILAN</h1>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ border: '1px solid var(--d-grid)' }}>
          {['Toutes', '2024', '2025', '2026'].map(y => (
            <button key={y} onClick={() => setYear(y)} className="num rounded-full px-3 py-1.5 text-xs font-semibold" style={year === y ? { background: 'var(--d-ink)', color: 'var(--d-bg)' } : { color: 'var(--d-muted)' }}>{y}</button>
          ))}
        </div>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--d-muted)' }}>
        Depuis janvier 2024, <b style={{ color: 'var(--d-ink)' }}>{TOTAL.n} paris</b> ont rapporté <b style={{ color: 'var(--d-ink)' }}>{eur0(TOTAL.pl, true)}</b> pour {eur0(TOTAL.staked)} misés, soit un ROI de <b style={{ color: 'var(--d-ink)' }}>{pct(TOTAL.roi, true)}</b>. Meilleure année : {BEST_YEAR.year} ({eur0(BEST_YEAR.pl, true)}).
      </p>
      <SportChips />

      <section className="grid gap-px overflow-hidden rounded-[14px] md:grid-cols-[1.4fr_1fr_1fr_1fr]" style={{ background: 'var(--d-grid)', border: '1px solid var(--d-grid)' }}>
        <div className="p-5" style={{ background: 'var(--d-surface)' }}>
          <Label>Bénéfice</Label>
          <div className="num mt-2 text-5xl font-semibold leading-none tracking-tight md:text-[64px]" style={{ color: 'var(--d-accent)' }}>{eur0(TOTAL.pl, true)}</div>
        </div>
        {[
          ['ROI', pct(TOTAL.roi, true), `${eur0(TOTAL.staked)} misés`],
          ['Réussite', pct(TOTAL.hit, false), `${TOTAL.wins} / ${TOTAL.n} réglés`],
          ['CLV moyen', pct(TOTAL.clv, true), `${pct(TOTAL.clvPos, false, 0)} de paris CLV +`],
        ].map(([l, v, s]) => (
          <div key={l} className="p-5" style={{ background: 'var(--d-surface)' }}>
            <Label>{l}</Label>
            <div className="num mt-2 text-3xl font-semibold leading-none">{v}</div>
            <div className="num mt-2 text-xs" style={{ color: 'var(--d-muted)' }}>{s}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="a-panel p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label>Bénéfice cumulé</Label>
            <div className="flex gap-1 text-xs">
              {(['continu', 'superpose'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} className="a-chip px-3 py-1 font-semibold" data-on={mode === m}>{m === 'continu' ? 'Continu' : 'Années superposées'}</button>
              ))}
            </div>
          </div>
          <CumulativeChart points={CUMULATIVE} mode={mode} height={260} />
        </div>
        <div className="a-panel p-4 md:p-5">
          <Label>Année par année</Label>
          <table className="num mt-3 w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--d-muted)' }}>
              <th className="py-1.5 text-left font-normal">An</th><th className="text-right font-normal">Paris</th><th className="text-right font-normal">Réussite</th><th className="text-right font-normal">Bénéfice</th><th className="text-right font-normal">ROI</th>
            </tr></thead>
            <tbody>
              {YEARS.map(y => (
                <tr key={y.year} style={{ borderTop: '1px solid var(--d-grid)' }}>
                  <td className="py-2.5 font-semibold">{y.year}</td>
                  <td className="text-right">{y.n}</td>
                  <td className="text-right">{pct(y.hit, false, 0)}</td>
                  <td className="text-right"><Signed v={y.pl} /></td>
                  <td className="text-right">{pct(y.roi, true)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--d-ink)' }}>
                <td className="py-2.5 font-semibold">Total</td><td className="text-right">{TOTAL.n}</td><td className="text-right">{pct(TOTAL.hit, false, 0)}</td>
                <td className="text-right font-semibold"><Signed v={TOTAL.pl} /></td><td className="text-right font-semibold">{pct(TOTAL.roi, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="a-panel p-4 md:p-5">
        <Label>Bénéfice par mois</Label>
        <div className="mt-3"><MonthlyBars months={MONTHS} height={190} /></div>
      </section>

      <section className="a-panel overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-5"><Label>Derniers paris</Label><span className="text-xs" style={{ color: 'var(--d-muted)' }}>Exporter CSV</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <tbody>
              {RECENT.map(b => (
                <tr key={b.id} style={{ borderTop: '1px solid var(--d-grid)' }}>
                  <td className="num w-16 py-3 pl-5 text-xs" style={{ color: 'var(--d-muted)' }}>{fmtDate(b.date)}</td>
                  <td className="w-8" style={{ color: 'var(--d-muted)' }}><SportIcon sport={b.sport} size={16} /></td>
                  <td className="py-3"><div className="font-semibold">{b.selection}</div><div className="text-xs" style={{ color: 'var(--d-muted)' }}>{b.game}</div></td>
                  <td className="num text-right">{eur0(b.stake)}</td>
                  <td className="num px-4 text-right font-semibold">{odd(b.odds)}</td>
                  <td className="w-24"><ResultTag b={b} /></td>
                  <td className="pr-5 text-right">{b.result === 'En cours' ? <span className="num" style={{ color: 'var(--d-muted)' }}>—</span> : <Signed v={profit(b)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function OddButton({ hdp, p }: { hdp?: string; p: number }) {
  return (
    <div className="a-odd flex items-center justify-between px-3 py-2.5" data-fav={p >= 0.5}>
      <span className="num text-xs" style={{ color: 'var(--d-muted)' }}>{hdp ?? 'Vainq.'}</span>
      <span className="num text-lg font-semibold" style={{ color: p >= 0.5 ? 'var(--d-accent)' : 'var(--d-ink)' }}>{odd(1 / p)}</span>
    </div>
  )
}

function Pastille({ initials, size = 30 }: { initials: string; size?: number }) {
  return <span className="num flex shrink-0 items-center justify-center rounded-md text-[11px] font-semibold" style={{ width: size, height: size, background: 'var(--d-surface-2)', border: '1px solid var(--d-grid)' }}>{initials}</span>
}

function Modeles() {
  const { a, b, delta, p, sa, sb } = CALC
  const [day, setDay] = useState(2)
  return (
    <main className="mx-auto max-w-[1360px] space-y-5 px-4 py-6 md:px-8">
      <div>
        <Label>Modèles · Elo GDM</Label>
        <h1 className="display mt-1 text-5xl leading-[0.9] md:text-6xl">LEC <span style={{ color: 'var(--d-muted)' }}>SU26</span></h1>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {['LEC SU26', 'LCK SU26', 'LPL SU26', 'EMEA SU26', 'Worlds 2026'].map((l, i) => (
          <span key={l} data-on={i === 0} className="a-chip shrink-0 px-3.5 py-1.5 text-xs font-semibold">{l}</span>
        ))}
      </div>

      {/* Bande de jours : matchs à venir avec cotes du modèle */}
      <section className="a-panel p-4">
        <div className="grid grid-cols-7 gap-1">
          {UPCOMING.map((d, i) => (
            <button key={d.day} onClick={() => setDay(i)} className="rounded-xl py-2 text-center" style={day === i ? { background: 'var(--d-accent)', color: 'var(--d-accent-ink)' } : { color: d.matches.length ? 'var(--d-ink)' : 'var(--d-muted)' }}>
              <div className="text-[10px] font-semibold tracking-wider">{d.day}</div>
              <div className="num text-lg font-semibold">{d.date}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {UPCOMING[day].matches.map(m => (
            <div key={m.a} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 md:grid-cols-[3rem_1fr_1fr_auto]" style={{ borderTop: '1px solid var(--d-grid)', paddingTop: 8 }}>
              <span className="num text-xs" style={{ color: 'var(--d-muted)' }}>{m.t}</span>
              <span className="text-sm font-semibold">{m.a} <span style={{ color: 'var(--d-muted)' }}>vs</span> {m.b}</span>
              <span className="hidden text-xs md:block" style={{ color: 'var(--d-muted)' }}>Cote modèle BO3</span>
              <div className="flex gap-2">
                <span className="a-odd num px-3 py-1.5 text-sm font-semibold" data-fav={m.oa < m.ob}>{odd(m.oa)}</span>
                <span className="a-odd num px-3 py-1.5 text-sm font-semibold" data-fav={m.ob < m.oa}>{odd(m.ob)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="a-panel overflow-hidden">
          <div className="p-4 md:p-5"><Label>Classement Elo GDM</Label></div>
          <div className="overflow-x-auto">
            <table className="num w-full min-w-[640px] text-sm">
              <thead><tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--d-muted)' }}>
                <th className="w-10 pb-2 pl-5 text-left font-normal">#</th><th className="text-left font-normal">Équipe</th>
                <th className="text-right font-normal">Entrée</th><th className="text-right font-normal">GDM</th><th className="text-right font-normal">Perf</th><th className="pr-5 text-right font-normal">Sortie</th>
              </tr></thead>
              <tbody>
                {RANKING.map((r, i) => {
                  const d = r.output - r.input
                  return (
                    <tr key={r.name} style={{ borderTop: '1px solid var(--d-grid)' }}>
                      <td className="py-2.5 pl-5" style={{ color: 'var(--d-muted)' }}>{i + 1}</td>
                      <td><div className="flex items-center gap-2.5 font-sans"><Pastille initials={r.initials} /><span className="font-semibold" style={{ fontFamily: 'var(--d-font-body)' }}>{r.name}</span></div></td>
                      <td className="text-right" style={{ color: 'var(--d-muted)' }}>{r.input}</td>
                      <td className="text-right" style={{ color: r.gdm >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{r.gdm > 0 ? '+' : r.gdm < 0 ? '−' : ''}{Math.abs(r.gdm)}</td>
                      <td className="text-right">{r.perf}</td>
                      <td className="pr-5 text-right"><span className="text-base font-semibold">{r.output}</span> <span className="text-xs" style={{ color: d >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{d >= 0 ? '▲' : '▼'}{Math.abs(d)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="a-panel p-4 md:p-5">
          <Label>Calculateur BO3 / BO5</Label>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-2"><Pastille initials={a.initials} size={36} /><div><div className="text-sm font-semibold">{a.name}</div><div className="num text-xs" style={{ color: 'var(--d-muted)' }}>{a.output}</div></div></div>
            <div className="num text-center text-xs" style={{ color: 'var(--d-muted)' }}>Δ {delta > 0 ? '+' : ''}{delta}</div>
            <div className="flex items-center justify-end gap-2 text-right"><div><div className="text-sm font-semibold">{b.name}</div><div className="num text-xs" style={{ color: 'var(--d-muted)' }}>{b.output}</div></div><Pastille initials={b.initials} size={36} /></div>
          </div>
          <div className="num mt-4 flex items-end justify-between" style={{ borderTop: '1px solid var(--d-grid)', paddingTop: 12 }}>
            <div><div className="text-3xl font-semibold" style={{ color: 'var(--d-accent)' }}>{pct(p, false)}</div><div className="text-xs" style={{ color: 'var(--d-muted)' }}>BO1 · {odd(1 / p)}</div></div>
            <div className="text-right"><div className="text-3xl font-semibold">{pct(1 - p, false)}</div><div className="text-xs" style={{ color: 'var(--d-muted)' }}>BO1 · {odd(1 / (1 - p))}</div></div>
          </div>
          {[
            ['BO3', [['Vainqueur', undefined, sa.bo3Win, undefined, sb.bo3Win], ['Hdp', '−1.5', sa.bo3M15, '+1.5', sb.bo3P15], ['Hdp', '+1.5', sa.bo3P15, '−1.5', sb.bo3M15]]],
            ['BO5', [['Vainqueur', undefined, sa.bo5Win, undefined, sb.bo5Win], ['Hdp', '−1.5', sa.bo5M15, '+1.5', sb.bo5P15], ['Hdp', '−2.5', sa.bo5M25, '+2.5', sb.bo5P25]]],
          ].map(([title, rows]) => (
            <div key={title as string} className="mt-4">
              <div className="display mb-2 text-xl">{title as string}</div>
              <div className="space-y-2">
                {(rows as [string, string | undefined, number, string | undefined, number][]).map(([, ha, pa, hb, pb], i) => (
                  <div key={i} className="grid grid-cols-2 gap-2"><OddButton hdp={ha} p={pa} /><OddButton hdp={hb} p={pb} /></div>
                ))}
              </div>
            </div>
          ))}
          <button className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold" style={{ border: '1px solid var(--d-accent)', color: 'var(--d-accent)' }}>Prendre ce pari →</button>
        </div>
      </section>
    </main>
  )
}

function Pari() {
  const [result, setResult] = useState<Record<number, string>>({})
  const [stake, setStake] = useState('200')
  const [oddsIn, setOddsIn] = useState('1.85')
  const gain = (parseFloat(stake) || 0) * ((parseFloat(oddsIn) || 0) - 1)
  return (
    <main className="mx-auto grid max-w-[1100px] gap-6 px-4 py-6 md:grid-cols-[400px_1fr] md:px-8">
      <section>
        <Label>Nouveau pari</Label>
        <div className="a-ticket mt-2 p-5" style={{ ['--notch' as string]: '66%' }}>
          <div className="flex items-center justify-between">
            <span className="display text-3xl">TICKET</span>
            <span className="num text-xs" style={{ color: 'var(--d-muted)' }}>10/11/2026</span>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block"><span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--d-muted)' }}>Match</span>
              <input className="a-input mt-1 w-full px-3 py-2.5 text-sm" defaultValue="Nordlys vs Halcyon" /></label>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--d-muted)' }}>Sport détecté
              <span className="a-chip flex items-center gap-1.5 px-2.5 py-1 font-semibold" data-on="true"><SportIcon sport="E-sport" size={14} /> E-sport</span>
            </div>
            <label className="block"><span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--d-muted)' }}>Position</span>
              <input className="a-input mt-1 w-full px-3 py-2.5 text-sm" defaultValue="Nordlys -1.5" /></label>
            <div className="text-xs" style={{ color: 'var(--d-muted)' }}>Marché : <span style={{ color: 'var(--d-ink)' }}>Handicap</span></div>
            <div className="flex gap-1 rounded-full p-1 text-xs font-semibold" style={{ border: '1px solid var(--d-grid)' }}>
              {['Commun', 'Kelicful'].map((p, i) => <span key={p} className="flex-1 rounded-full py-1.5 text-center" style={i === 0 ? { background: 'var(--d-ink)', color: 'var(--d-bg)' } : { color: 'var(--d-muted)' }}>{p}</span>)}
            </div>
          </div>
          <div className="a-perf -mx-5 my-5" />
          <div className="grid grid-cols-2 gap-3">
            <label><span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--d-muted)' }}>Mise €</span>
              <input inputMode="decimal" value={stake} onChange={e => setStake(e.target.value)} className="a-input num mt-1 w-full px-3 py-2.5 text-2xl font-semibold" /></label>
            <label><span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--d-muted)' }}>Cote</span>
              <input inputMode="decimal" value={oddsIn} onChange={e => setOddsIn(e.target.value)} className="a-input num mt-1 w-full px-3 py-2.5 text-2xl font-semibold" /></label>
          </div>
          <div className="mt-2 flex gap-2">
            {[50, 100, 200, 500].map(v => <button key={v} onClick={() => setStake(String(v))} className="a-chip num flex-1 py-1.5 text-xs font-semibold" data-on={stake === String(v)}>{v}</button>)}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-xs" style={{ color: 'var(--d-muted)' }}>Gain potentiel</span>
            <span className="num text-2xl font-semibold" style={{ color: 'var(--d-accent)' }}>{eur(gain, true)}</span>
          </div>
          <div className="mt-2 text-xs" style={{ color: 'var(--d-muted)' }}>+ Plus : cote de clôture, ligue, placé par, part Squawo, note</div>
          <button className="mt-4 w-full rounded-full py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: 'var(--d-accent)', color: 'var(--d-accent-ink)' }}>Enregistrer le pari</button>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <Label>En cours · {OPEN.length}</Label>
          <span className="num text-xs" style={{ color: 'var(--d-muted)' }}>Engagé {eur0(OPEN.reduce((s, b) => s + b.stake, 0))}</span>
        </div>
        <div className="mt-2 space-y-3">
          {OPEN.map(b => (
            <div key={b.id} className="a-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--d-muted)' }}><SportIcon sport={b.sport} size={14} /> {fmtDate(b.date)} · {b.placedBy}</div>
                  <div className="mt-1 font-semibold">{b.selection}</div>
                  <div className="truncate text-xs" style={{ color: 'var(--d-muted)' }}>{b.game}</div>
                </div>
                <div className="num text-right"><div className="text-lg font-semibold">{odd(b.odds)}</div><div className="text-xs" style={{ color: 'var(--d-muted)' }}>{eur0(b.stake)}</div></div>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {[['G', 'Gagnant'], ['P', 'Perdant'], ['½G', '1/2 Gagnant'], ['½P', '1/2 Perdant'], ['R', 'Remboursé']].map(([s, full]) => {
                  const on = result[b.id] === full
                  return (
                    <button key={s} title={full} onClick={() => setResult(r => ({ ...r, [b.id]: full }))} className="num rounded-lg py-2 text-sm font-semibold"
                      style={on ? { background: full.includes('Perdant') ? 'var(--d-loss)' : 'var(--d-accent)', color: 'var(--d-accent-ink)' } : { background: 'var(--d-surface-2)', border: '1px solid var(--d-grid)' }}>{s}</button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export function DraftA({ screen }: { screen: Screen }) {
  if (screen === 'tokens') return <div className="draft-root draft-a"><TokenSheet t={TOKENS_A} /></div>
  return <Shell screen={screen}>{screen === 'bilan' ? <Bilan /> : screen === 'modeles' ? <Modeles /> : <Pari />}</Shell>
}
