// Draft C — « Carnet » : papier blanc cassé, encre noire, serif éditoriale, chiffres de machine à écrire,
// un seul accent corail en aplat. Esprit registre de paris tenu à la main.
import { useState, type ReactNode } from 'react'
import { CumulativeChart, MonthlyBars } from './charts'
import { SportIcon, PlusIcon } from './icons'
import { TokenSheet } from './TokenSheet'
import { TOKENS_C } from './tokens'
import {
  TOTAL, YEARS, BEST_YEAR, CUMULATIVE, MONTHS, RECENT, RANKING, CALC, OPEN, BETS,
  eur0, eur, pct, odd, fmtDate, profit, type FakeBet,
} from './fakeData'
import type { Screen } from './DraftsPage'

const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`text-[12px] uppercase tracking-[0.14em] ${className}`} style={{ color: 'var(--d-muted)' }}>{children}</div>
)

function Signed({ v, cents = false }: { v: number; cents?: boolean }) {
  return <span className="num" style={{ color: v > 0 ? 'var(--d-win)' : v < 0 ? 'var(--d-loss)' : 'var(--d-ink)' }}>{cents ? eur(v, true) : eur0(v, true)}</span>
}

function Stamp({ b }: { b: FakeBet }) {
  const won = b.result === 'Gagnant' || b.result === '1/2 Gagnant', lost = b.result === 'Perdant' || b.result === '1/2 Perdant'
  const txt = { 'Gagnant': 'Gagné', '1/2 Gagnant': '1/2 gagné', 'Perdant': 'Perdu', '1/2 Perdant': '1/2 perdu', 'Remboursé': 'Remb.', 'En cours': 'En cours' }[b.result]
  return <span className="c-stamp num inline-block -rotate-2 px-1.5 py-px text-[10px]" style={{ color: won ? 'var(--d-win)' : lost ? 'var(--d-loss)' : 'var(--d-muted)' }}>{txt}</span>
}

function OddBox({ hdp, pr }: { hdp?: string; pr: number }) {
  return (
    <div className="c-odd num flex items-baseline justify-between px-3 py-2" data-fav={pr >= 0.5}>
      <span className="text-xs">{hdp ?? 'vainq.'}</span><span className="text-lg font-bold">{odd(1 / pr)}</span>
    </div>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block pt-3"><Note>{label}</Note>{children}</label>
}

function Shell({ active, children }: { active: string; children: ReactNode }) {
  const tabs = ['Paris', 'Modèles', 'Kelicful', 'Réglages']
  return (
    <div className="draft-root draft-c pb-24 md:pb-12">
      <header className="mx-auto max-w-[1240px] px-4 pt-5 md:px-8">
        <div className="flex items-baseline justify-between gap-4 pb-3 c-rule">
          <div className="display text-[26px] leading-none md:text-[30px]">Registre <span style={{ color: 'var(--d-accent)' }}>BPB</span></div>
          <div className="num hidden text-xs md:block" style={{ color: 'var(--d-muted)' }}>Saison 2026 · feuillet n° 48</div>
          <button className="c-btn flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"><PlusIcon size={15} /> <span className="hidden sm:inline">Inscrire un pari</span><span className="sm:hidden">Pari</span></button>
        </div>
        <nav className="flex gap-5 overflow-x-auto pt-2 text-[15px] c-hair">
          {tabs.map(t => <span key={t} data-on={t === active} className="c-tab shrink-0 pb-2" style={{ color: t === active ? undefined : 'var(--d-muted)' }}>{t}</span>)}
        </nav>
      </header>
      {children}
    </div>
  )
}

function Bilan() {
  const [mode, setMode] = useState<'continu' | 'superpose'>('continu')
  const [year, setYear] = useState('Toutes')
  return (
    <Shell active="Paris">
      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-8">
          <h1 className="display text-5xl leading-[0.95] md:text-[64px]">Le bilan commun</h1>
          <div className="num flex gap-4 text-sm">
            {['Toutes', '2024', '2025', '2026'].map(y => <button key={y} data-on={year === y} onClick={() => setYear(y)} className="c-tab pb-1" style={{ color: year === y ? undefined : 'var(--d-muted)' }}>{y}</button>)}
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-[19px] italic leading-snug">
          Depuis janvier 2024, {TOTAL.n} paris ont rapporté <Signed v={TOTAL.pl} /> pour <span className="num">{eur0(TOTAL.staked)}</span> misés, soit un ROI de <span className="num">{pct(TOTAL.roi, true)}</span>. La meilleure année reste {BEST_YEAR.year}, à <Signed v={BEST_YEAR.pl} />.
        </p>

        <section className="mt-8 grid grid-cols-2 border-y md:grid-cols-4" style={{ borderColor: 'var(--d-ink)' }}>
          {[
            ['Bénéfice', <Signed v={TOTAL.pl} />, 'paris et ajustements'],
            ['Rendement', <span className="num">{pct(TOTAL.roi, true)}</span>, `sur ${eur0(TOTAL.staked)} misés`],
            ['Réussite', <span className="num">{pct(TOTAL.hit, false)}</span>, `${TOTAL.wins} gagnants sur ${TOTAL.n}`],
            ['Valeur (CLV)', <span className="num">{pct(TOTAL.clv, true)}</span>, `${pct(TOTAL.clvPos, false, 0)} au-dessus de la clôture`],
          ].map(([l, v, s], i) => (
            <div key={l as string} className="px-4 py-5 md:px-6" style={{ borderLeft: i % 2 || i === 2 ? '1px solid var(--d-grid)' : undefined, borderTop: i >= 2 ? '1px solid var(--d-grid)' : undefined }}>
              <Note>{l}</Note>
              <div className={`mt-2 leading-none ${i === 0 ? 'text-[34px] md:text-[44px]' : 'text-[28px] md:text-[34px]'}`}>{v}</div>
              <div className="mt-2 text-sm italic" style={{ color: 'var(--d-muted)' }}>{s}</div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between c-hair pb-2">
              <h2 className="display text-[22px]">Bénéfice cumulé</h2>
              <div className="flex gap-3 text-sm">{(['continu', 'superpose'] as const).map(m => <button key={m} data-on={mode === m} onClick={() => setMode(m)} className="c-tab pb-0.5" style={{ color: mode === m ? undefined : 'var(--d-muted)' }}>{m === 'continu' ? 'continu' : 'années superposées'}</button>)}</div>
            </div>
            <div className="mt-4"><CumulativeChart points={CUMULATIVE} mode={mode} height={250} /></div>
          </div>
          <div>
            <div className="c-hair pb-2"><h2 className="display text-[22px]">Année par année</h2></div>
            <table className="num mt-2 w-full text-[15px]">
              <tbody>
                {YEARS.map(y => (
                  <tr key={y.year} className="c-hair">
                    <td className="display py-3 text-[20px]" style={{ fontFamily: 'var(--d-font-display)' }}>{y.year}</td>
                    <td className="text-right text-sm" style={{ color: 'var(--d-muted)' }}>{y.n} paris</td>
                    <td className="text-right"><Signed v={y.pl} /></td>
                    <td className="text-right text-sm">{pct(y.roi, true)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid var(--d-ink)' }}>
                  <td className="py-3 text-sm italic" style={{ fontFamily: 'var(--d-font-body)' }}>Total</td><td className="text-right text-sm">{TOTAL.n} paris</td><td className="text-right font-bold"><Signed v={TOTAL.pl} /></td><td className="text-right text-sm font-bold">{pct(TOTAL.roi, true)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <div className="c-hair pb-2"><h2 className="display text-[22px]">Mois par mois</h2></div>
          <div className="mt-4"><MonthlyBars months={MONTHS} height={180} /></div>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between c-hair pb-2"><h2 className="display text-[22px]">Derniers paris inscrits</h2><span className="text-sm italic" style={{ color: 'var(--d-muted)' }}>exporter en CSV</span></div>
          <div className="overflow-x-auto">
            <div className="c-margin min-w-[700px] pl-4" style={{ background: 'var(--d-surface)' }}>
              {RECENT.map(b => (
                <div key={b.id} className="grid grid-cols-[52px_22px_1fr_90px_60px_96px_100px] items-center gap-3 py-2.5 c-hair">
                  <span className="num text-sm" style={{ color: 'var(--d-muted)' }}>{fmtDate(b.date)}</span>
                  <span style={{ color: 'var(--d-muted)' }}><SportIcon sport={b.sport} size={16} stroke={1.4} /></span>
                  <span className="min-w-0"><span className="text-[15px] font-semibold">{b.selection}</span> <span className="text-sm italic" style={{ color: 'var(--d-muted)' }}>— {b.game}</span></span>
                  <span className="num text-right">{eur0(b.stake)}</span>
                  <span className="num text-right font-bold">{odd(b.odds)}</span>
                  <span className="text-center"><Stamp b={b} /></span>
                  <span className="pr-4 text-right">{b.result === 'En cours' ? <span className="num" style={{ color: 'var(--d-muted)' }}>—</span> : <Signed v={profit(b)} />}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Shell>
  )
}

function Modeles() {
  const { a, b, delta, p, sa, sb } = CALC
  return (
    <Shell active="Modèles">
      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        <div className="pt-8">
          <Note>Modèles · Elo GDM depuis le 29 juillet</Note>
          <h1 className="display mt-1 text-5xl leading-[0.95] md:text-[64px]">LEC, été 2026</h1>
          <div className="mt-4 flex gap-5 overflow-x-auto text-[15px]">
            {['LEC SU26', 'LCK SU26', 'LPL SU26', 'EMEA SU26', 'Worlds 2026'].map((l, i) => <span key={l} data-on={i === 0} className="c-tab shrink-0 pb-1" style={{ color: i === 0 ? undefined : 'var(--d-muted)' }}>{l}</span>)}
          </div>
        </div>
        <section className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="min-w-0">
            <div className="c-hair pb-2"><h2 className="display text-[22px]">Classement</h2></div>
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[600px] text-[15px]">
                <thead><tr className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--d-muted)', fontFamily: 'var(--d-font-body)' }}>
                  <th className="py-2 text-left font-normal">N°</th><th className="text-left font-normal">Équipe</th><th className="text-right font-normal">Entrée</th><th className="text-right font-normal">GDM</th><th className="text-right font-normal">Perf.</th><th className="text-right font-normal">Sortie</th>
                </tr></thead>
                <tbody>
                  {RANKING.map((r, i) => {
                    const d = r.output - r.input
                    return (
                      <tr key={r.name} className="c-hair">
                        <td className="py-2.5" style={{ color: 'var(--d-muted)' }}>{String(i + 1).padStart(2, '0')}</td>
                        <td><span className="inline-flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px]" style={{ border: '1px solid var(--d-ink)' }}>{r.initials}</span><span className="text-[16px]" style={{ fontFamily: 'var(--d-font-body)', fontWeight: 600 }}>{r.name}</span></span></td>
                        <td className="text-right" style={{ color: 'var(--d-muted)' }}>{r.input}</td>
                        <td className="text-right" style={{ color: r.gdm >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{r.gdm > 0 ? '+' : r.gdm < 0 ? '−' : ''}{Math.abs(r.gdm)}</td>
                        <td className="text-right">{r.perf}</td>
                        <td className="text-right"><b className="text-[17px]">{r.output}</b> <span className="text-xs" style={{ color: d >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{d >= 0 ? '+' : '−'}{Math.abs(d)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="c-hair pb-2"><h2 className="display text-[22px]">Fiche de cotes</h2></div>
            <div className="mt-4 p-5" style={{ background: 'var(--d-surface)', border: '1px solid var(--d-grid)' }}>
              <div className="flex items-baseline justify-between">
                <span className="display text-[24px]">{a.name}</span><span className="text-sm italic" style={{ color: 'var(--d-muted)' }}>contre</span><span className="display text-[24px]">{b.name}</span>
              </div>
              <div className="num mt-1 flex justify-between text-sm" style={{ color: 'var(--d-muted)' }}><span>{a.output}</span><span>écart {delta > 0 ? '+' : ''}{delta}</span><span>{b.output}</span></div>
              <div className="num mt-4 flex items-baseline justify-between py-3" style={{ borderTop: '1px solid var(--d-ink)', borderBottom: '1px solid var(--d-ink)' }}>
                <span className="text-[34px] leading-none">{pct(p, false)}</span><span className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--d-muted)', fontFamily: 'var(--d-font-body)' }}>BO1</span><span className="text-[34px] leading-none">{pct(1 - p, false)}</span>
              </div>
              {[
                ['BO3', [[undefined, sa.bo3Win, undefined, sb.bo3Win], ['−1.5', sa.bo3M15, '+1.5', sb.bo3P15], ['+1.5', sa.bo3P15, '−1.5', sb.bo3M15]]],
                ['BO5', [[undefined, sa.bo5Win, undefined, sb.bo5Win], ['−1.5', sa.bo5M15, '+1.5', sb.bo5P15], ['−2.5', sa.bo5M25, '+2.5', sb.bo5P25]]],
              ].map(([t, rows]) => (
                <div key={t as string} className="mt-4">
                  <div className="display mb-2 text-[18px]">{t as string}</div>
                  <div className="space-y-1.5">
                    {(rows as [string | undefined, number, string | undefined, number][]).map(([ha, pa, hb, pb], i) => (
                      <div key={i} className="grid grid-cols-2 gap-1.5"><OddBox hdp={ha} pr={pa} /><OddBox hdp={hb} pr={pb} /></div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-3 text-sm italic" style={{ color: 'var(--d-muted)' }}>s = 40 · cotes justes, sans marge</div>
            </div>
          </div>
        </section>
      </main>
    </Shell>
  )
}

function Pari() {
  const [stake, setStake] = useState('200')
  const [o, setO] = useState('1.85')
  const [res, setRes] = useState<Record<number, string>>({})
  const gain = (parseFloat(stake) || 0) * ((parseFloat(o) || 0) - 1)
  const open = [...OPEN, { ...BETS[BETS.length - 7], id: 9101, result: 'En cours' as const }]
  return (
    <Shell active="Paris">
      <main className="mx-auto grid max-w-[1240px] gap-10 px-4 pt-8 md:px-8 lg:grid-cols-[420px_1fr]">
        <section>
          <h1 className="display text-[40px] leading-none">Inscrire un pari</h1>
          <div className="num mt-1 text-sm" style={{ color: 'var(--d-muted)' }}>mardi 10 novembre 2026</div>
          <div className="mt-4 p-5" style={{ background: 'var(--d-surface)', border: '1px solid var(--d-grid)' }}>
            <Line label="Match"><input className="c-input w-full py-1.5 text-[18px]" defaultValue="Nordlys vs Halcyon" /></Line>
            <Line label="Position"><input className="c-input w-full py-1.5 text-[18px]" defaultValue="Nordlys -1.5" /></Line>
            <div className="mt-2 text-sm italic" style={{ color: 'var(--d-muted)' }}>e-sport, handicap — <u>modifier</u></div>
            <div className="mt-2 grid grid-cols-2 gap-5">
              <Line label="Mise"><input className="c-input num w-full py-1 text-[30px]" value={stake} onChange={e => setStake(e.target.value)} inputMode="decimal" /></Line>
              <Line label="Cote"><input className="c-input num w-full py-1 text-[30px]" value={o} onChange={e => setO(e.target.value)} inputMode="decimal" /></Line>
            </div>
            <div className="mt-4 flex gap-5 text-[15px]">
              {['Commun', 'Kelicful'].map((x, i) => <span key={x} data-on={i === 0} className="c-tab pb-0.5" style={{ color: i === 0 ? undefined : 'var(--d-muted)' }}>{x}</span>)}
              <span className="ml-auto italic" style={{ color: 'var(--d-muted)' }}>pris</span>
            </div>
            <div className="mt-5 flex items-baseline justify-between pt-3" style={{ borderTop: '1px solid var(--d-ink)' }}>
              <span className="text-sm italic">gain si gagné</span><span className="num text-[26px]" style={{ color: 'var(--d-win)' }}>{eur(gain, true)}</span>
            </div>
            <div className="mt-1 text-sm italic" style={{ color: 'var(--d-muted)' }}>+ plus : clôture, ligue, placé par, part Squawo, note</div>
            <button className="c-btn mt-5 w-full py-3 text-[15px] font-semibold">Inscrire au registre</button>
          </div>
        </section>
        <section>
          <div className="flex items-baseline justify-between c-hair pb-2">
            <h2 className="display text-[26px]">En cours</h2>
            <span className="num text-sm" style={{ color: 'var(--d-muted)' }}>{open.length} paris · {eur0(open.reduce((s, b) => s + b.stake, 0))} engagés</span>
          </div>
          <div className="c-margin pl-4">
            {open.map(b => (
              <div key={b.id} className="py-4 c-hair">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[17px] font-semibold">{b.selection}</div>
                    <div className="truncate text-sm italic" style={{ color: 'var(--d-muted)' }}>{b.game} · {fmtDate(b.date)} · {b.placedBy}</div>
                  </div>
                  <div className="num shrink-0 text-right"><div className="text-[20px] font-bold">{odd(b.odds)}</div><div className="text-sm" style={{ color: 'var(--d-muted)' }}>{eur0(b.stake)}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Gagné', 'Perdu', '1/2 gagné', '1/2 perdu', 'Remboursé'].map(x => {
                    const on = res[b.id] === x
                    const col = x.includes('agn') ? 'var(--d-win)' : x.includes('erd') ? 'var(--d-loss)' : 'var(--d-muted)'
                    return <button key={x} onClick={() => setRes(r => ({ ...r, [b.id]: x }))} className="c-stamp num px-2.5 py-1.5 text-[11px]" style={{ color: on ? 'var(--d-surface)' : col, background: on ? col : 'transparent', borderColor: col }}>{x}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <button aria-label="Nouveau pari" className="c-btn fixed bottom-5 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full md:hidden"><PlusIcon size={22} /></button>
    </Shell>
  )
}

export function DraftC({ screen }: { screen: Screen }) {
  if (screen === 'tokens') return <div className="draft-root draft-c"><TokenSheet t={TOKENS_C} /></div>
  return screen === 'bilan' ? <Bilan /> : screen === 'modeles' ? <Modeles /> : <Pari />
}
