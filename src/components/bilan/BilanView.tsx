// Écran « Bilan » d'un portefeuille (commun ou Kelicful) — reprend le tableau de bord de l'Excel.
// Règles : paris réglés = G, P, ½G, ½P ; ROI = (bénéfice + ajustements) ÷ misé ; « Vu pas pris » exclus ;
// saisons masquées et date de remise à zéro appliquées sans rien supprimer.
import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import type { Bet, BetResult, Market, MoneyMove, Portfolio } from '@/types/betting'
import { RESULTS } from '@/types/betting'
import { summarize, groupSummaries, cumulative, visible, formatEur, formatPct, formatNum, isSettled, resultProfit, type Summary } from '@/lib/betStats'
import { CumulativeChart, MonthlyBars } from '@/components/charts/Charts'
import { BetTable, Signed } from '@/components/bets/BetTable'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
/** Teinte du CLV moyen (style Suisse) : rouge foncé sous −3 %, rouge-jaune → vert-jaune entre −3 et +3 %, de plus en plus vert au-delà. */
function clvStyle(v: number | null): CSSProperties | undefined {
  if (v == null) return undefined
  const p = v * 100
  if (p <= -3) return { '--clv-h': '0', '--clv-dark': '1' } as CSSProperties
  const h = p < 3 ? 20 + ((p + 3) / 6) * 65 : 85 + Math.min(1, (p - 3) / 5) * 55   // 20 (rouge-jaune) → 85 (vert-jaune) → 140 (vert)
  return { '--clv-h': h.toFixed(0), '--clv-dark': '0' } as CSSProperties
}
const eur0 = (n: number, signed = false) => formatEur(n, { signed, decimals: 0 })

interface Props {
  portfolio: Portfolio
  bets: Bet[]
  moves: MoneyMove[]
  hiddenSeasons: number[]
  resetDate: string | null
  sportFirst?: boolean          // espace Kelicful : filtre Sport mis en avant
}

/** Adversaire déduit du match (« A vs B » ou « A - B ») : l'autre côté que la position. */
function opponentOf(b: Bet) {
  if (!b.game) return ''
  const sides = b.game.split(/\s+(?:vs\.?|v|-|–)\s+/i)
  if (sides.length !== 2) return b.game
  const team = b.selection.replace(/\s*[+\-−]\s?\d+([.,]\d+)?\s*$/, '').trim().toLowerCase()
  const other = sides.find(x => !x.toLowerCase().startsWith(team) && !team.startsWith(x.toLowerCase().trim()))
  return other ? `vs ${other.replace(/\s+\d+-\d+.*$/, '')}` : b.game
}

/** Bénéfice d'un pari sans « € », signe toujours affiché (couleur gain / perte du thème). */
function BetResultAmount({ b }: { b: Bet }) {
  const p = Math.round(resultProfit(b) * 100) / 100
  return <span className={`font-mono font-semibold ${p > 0 ? 'text-win' : p < 0 ? 'text-loss' : 'text-muted'}`}>{p > 0 ? '+' : p < 0 ? '−' : ''}{formatNum(Math.abs(p), 2)}</span>
}

function Panel({ title, sub, right, children, flush }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5">
        <div><h2 className="text-sm font-semibold">{title}</h2>{sub && <p className="text-xs text-muted">{sub}</p>}</div>
        {right}
      </div>
      <div className={flush ? 'mt-2' : 'px-4 pb-4 pt-2'}>{children}</div>
    </section>
  )
}

type Row = Summary & { key: string; label: ReactNode }

/** Sports exclus du bilan, mémorisés par portefeuille sur cet appareil. */
function useExcludedSports(portfolio: Portfolio) {
  const key = `sk-bilan-sports-${portfolio}`
  const [excluded, setExcluded] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] } })
  const save = (v: string[]) => { setExcluded(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* stockage indisponible */ } }
  return [excluded, save] as const
}

/** Compter ou non les paris en live, mémorisé par portefeuille sur cet appareil. */
function useLiveCounted(portfolio: Portfolio) {
  const key = `sk-bilan-live-${portfolio}`
  const [on, setOn] = useState<boolean>(() => { try { return localStorage.getItem(key) !== '0' } catch { return true } })
  const save = (v: boolean) => { setOn(v); try { localStorage.setItem(key, v ? '1' : '0') } catch { /* stockage indisponible */ } }
  return [on, save] as const
}

/** Menu à coches des sports (barre d'outils de l'historique). */
function SportChecklist({ sports, excluded, onChange, live, onLive, hasLive }: { sports: string[]; excluded: string[]; onChange: (v: string[]) => void; live: boolean; onLive: (v: boolean) => void; hasLive: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const counted = sports.filter(x => !excluded.includes(x))
  const toggle = (x: string) => onChange(excluded.includes(x) ? excluded.filter(e => e !== x) : [...excluded, x])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="field flex items-center gap-1.5 px-2 py-1.5 text-xs">
        {excluded.length ? `Sports : ${counted.length} / ${sports.length}` : 'Tous les sports'}{hasLive && !live ? ' · sans live' : ''} <span className="text-faint">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[190px] border border-ink bg-bg py-1 text-xs">
          {sports.map(x => (
            <div key={x} className="flex items-center justify-between gap-3 px-3 py-1 hover:bg-raised">
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={!excluded.includes(x)} onChange={() => toggle(x)} className="accent-[var(--color-ink)]" />{x}
              </label>
              <button type="button" onClick={() => onChange(sports.filter(y => y !== x))} className="text-[10px] text-faint hover:text-ink">seul</button>
            </div>
          ))}
          {hasLive && (
            <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-line px-3 pb-1 pt-1.5 hover:bg-raised">
              <input type="checkbox" checked={live} onChange={() => onLive(!live)} className="accent-[var(--color-ink)]" />Paris en live
            </label>
          )}
          <div className="mt-1 border-t border-line px-3 pb-1 pt-1.5">
            <button type="button" onClick={() => { onChange([]); onLive(true) }} className="text-faint underline underline-offset-2 hover:text-ink">Tout cocher</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Petit tableau de bilan (par année, par sport, par marché, par CLV) ; une ligne cliquable peut filtrer la page. */
function SummaryTable({ rows, total, columns, selected, onPick }: {
  rows: Row[]; total?: Row; columns: ('n' | 'staked' | 'avgStake' | 'avgOdds' | 'hit' | 'profit' | 'roi' | 'clv')[]
  selected?: string | null; onPick?: (key: string) => void
}) {
  const head: Record<string, string> = { n: 'Paris', staked: 'Misé', avgStake: 'Mise moy.', avgOdds: 'Cote moy.', hit: 'Réussite', profit: 'Bénéfice', roi: 'ROI', clv: 'CLV moy.' }
  const cell = (r: Row, c: string) => {
    switch (c) {
      case 'n': return r.count
      case 'staked': return eur0(r.staked)
      case 'avgStake': return r.avgStake == null ? '—' : eur0(r.avgStake)
      case 'avgOdds': return r.avgOdds == null ? '—' : r.avgOdds.toFixed(2)
      case 'hit': return formatPct(r.hitRate)
      case 'profit': return <Signed v={r.profit} decimals={0} />
      case 'roi': return <span className={r.roi == null ? '' : r.roi > 0 ? 'text-win' : r.roi < 0 ? 'text-loss' : ''}>{formatPct(r.roi, { signed: true })}</span>
      case 'clv': return formatPct(r.clvAvg, { signed: true })
    }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] font-mono text-[13px]">
        <thead><tr className="border-b border-line text-muted">
          <th className="px-4 py-2 text-left font-sans font-medium" />
          {columns.map(c => <th key={c} className="px-2 py-2 text-right font-sans font-medium last:pr-4">{head[c]}</th>)}
        </tr></thead>
        <tbody>
          {rows.map(r => {
            const sel = selected === r.key
            return (
              <tr key={r.key} onClick={onPick ? () => onPick(r.key) : undefined}
                className={`border-b border-line ${onPick ? 'cursor-pointer hover:bg-stripe' : ''} ${sel ? 'bg-[color-mix(in_srgb,var(--color-accent)_7%,transparent)]' : ''}`}>
                <td className="px-4 py-2 font-sans" style={sel ? { boxShadow: 'inset 2px 0 0 var(--color-accent)' } : undefined}>{r.label}</td>
                {columns.map(c => <td key={c} className="px-2 py-2 text-right last:pr-4">{cell(r, c)}</td>)}
              </tr>
            )
          })}
          {total && (
            <tr className="font-semibold">
              <td className="px-4 py-2 font-sans">{total.label}</td>
              {columns.map(c => <td key={c} className="px-2 py-2 text-right last:pr-4">{cell(total, c)}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function BilanView({ portfolio, bets, moves, hiddenSeasons, resetDate, sportFirst = false }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [year, setYear] = useState<string>('Toutes')
  const [excludedRaw, setExcluded] = useExcludedSports(portfolio)
  const [liveRaw, setLive] = useLiveCounted(portfolio)
  const [market, setMarket] = useState<Market | null>(null)
  const [result, setResult] = useState<BetResult | 'Tous'>('Tous')
  const [mode, setMode] = useState<'continu' | 'superpose'>('continu')

  const masking = showAll ? {} : { hiddenSeasons, resetDate }
  const masked = !showAll && (hiddenSeasons.length > 0 || !!resetDate)

  // Base : portefeuille, paris pris, masquage appliqué
  const base = visible(bets.filter(b => b.portfolio === portfolio && b.status === 'Pris'), masking)
  const baseMoves = visible(moves.filter(m => m.portfolio === portfolio && m.kind === 'Ajustement'), masking)

  const years = [...new Set(base.map(b => b.bet_date.slice(0, 4)))].sort()
  const sports = [...new Set(base.map(b => b.sport))].sort()
  // Sports décochés : seuls ceux qui existent dans ce portefeuille comptent (un sport disparu ne bloque rien)
  const excluded = excludedRaw.filter(x => sports.includes(x))
  const hasLive = base.some(b => b.is_live)
  const live = liveRaw || !hasLive   // sans pari live dans ce portefeuille, la case n'a pas d'effet
  const sportOn = (b: Bet) => !excluded.includes(b.sport) && (live || !b.is_live)
  const toggleSport = (x: string) => setExcluded(excluded.includes(x) ? excluded.filter(e => e !== x) : [...excluded, x])
  const inYear = (d: string) => year === 'Toutes' || d.startsWith(year)
  const bySportMarket = (b: Bet) => sportOn(b) && (!market || b.market === market)
  // Les ajustements n'ont ni sport ni marché : ils ne comptent que sans ces filtres
  const movesOn = excluded.length === 0 && live && !market

  const filtered = base.filter(b => inYear(b.bet_date) && bySportMarket(b))
  const filteredMoves = movesOn ? baseMoves.filter(m => inYear(m.move_date)) : []
  const s = summarize(filtered, filteredMoves)

  const yearRows: Row[] = groupSummaries(base.filter(bySportMarket), movesOn ? baseMoves : [], d => d.slice(0, 4)).map(g => ({ ...g, label: g.key }))
  const allYears = summarize(base.filter(bySportMarket), movesOn ? baseMoves : [])
  const bestYear = [...yearRows].sort((a, b) => b.profit - a.profit)[0]
  const months = groupSummaries(filtered, filteredMoves, d => d.slice(0, 7)).map(g => ({ month: g.key, pl: g.profit, staked: g.staked, n: g.count, roi: g.roi ?? 0 }))
  const curve = cumulative(filtered, filteredMoves)
  // Courbe « fin de mois » : un point par mois (dernier cumul du mois)
  const monthEnd = Object.values(curve.reduce<Record<string, { date: string; value: number }>>((acc, p) => { acc[p.date.slice(0, 7)] = p; return acc }, {}))
  const betCount = filtered.length
  const heroRounded = Math.round(s.profit)
  const heroSign = heroRounded > 0 ? '+' : heroRounded < 0 ? '−' : ''
  const heroInt = formatNum(Math.abs(heroRounded), 0)
  const sortedDates = filtered.map(b => b.bet_date).sort()
  const monthName = (d: string) => `${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`
  const periodLabel = `${portfolio === 'kelicful' ? 'Bilan Kelicful' : 'Bilan commun'}${sortedDates.length ? `, ${monthName(sortedDates[0])} – ${monthName(sortedDates[sortedDates.length - 1])}` : ''}`
  const lastBets = [...filtered].filter(b => isSettled(b.result)).sort((a, b) => b.bet_date.localeCompare(a.bet_date) || b.created_at.localeCompare(a.created_at)).slice(0, 5)

  const yearScoped = base.filter(b => inYear(b.bet_date))
  const marketRows: Row[] = groupSummaries(yearScoped.filter(sportOn), [], (_d, b) => b?.market ?? 'Autre').map(g => ({ ...g, label: g.key })).sort((a, b) => b.count - a.count)
  const sportRows: Row[] = groupSummaries(yearScoped.filter(b => !market || b.market === market), [], (_d, b) => b?.sport ?? '—').map(g => ({ ...g, label: g.key })).sort((a, b) => b.count - a.count)
  const settled = filtered.filter(b => isSettled(b.result))
  const clvRows: Row[] = [
    { key: 'pos', label: 'CLV positif', ...summarize(settled.filter(b => b.clv != null && Number(b.clv) > 0)) },
    { key: 'neg', label: 'CLV nul ou négatif', ...summarize(settled.filter(b => b.clv != null && Number(b.clv) <= 0)) },
    { key: 'none', label: 'Sans clôture', ...summarize(settled.filter(b => b.clv == null)) },
  ]

  const firstDate = base[0]?.bet_date ? [...base].sort((a, b) => a.bet_date.localeCompare(b.bet_date))[0].bet_date : null
  const since = year === 'Toutes'
    ? (firstDate ? `Depuis ${MONTHS[+firstDate.slice(5, 7) - 1]} ${firstDate.slice(0, 4)}` : '')
    : `En ${year}`
  const counted = sports.filter(x => !excluded.includes(x))
  const filterLabel = [excluded.length ? `sans ${excluded.join(', ')}` : null, live ? null : 'sans live', market].filter(Boolean).join(', ')

  // Coches de sports : pilule allumée = sport compté ; « Tous » recoche tout
  const sportSelect = (sports.length > 1 || hasLive) && (
    <div className="flex flex-wrap items-start gap-1.5" role="group" aria-label="Sports comptés">
      <button data-on={excluded.length === 0} onClick={() => setExcluded([])} className="pill shrink-0 px-3 py-1.5 text-xs">Tous</button>
      {sports.map(x => (
        <span key={x} className="flex shrink-0 flex-col items-center">
          <button data-on={excluded.length > 0 && !excluded.includes(x)} aria-pressed={!excluded.includes(x)} onClick={() => toggleSport(x)}
            className={`pill px-3 py-1.5 text-xs ${excluded.includes(x) ? 'line-through opacity-60' : ''}`}>{x}</button>
          {/* « seul » : ne compter que ce sport */}
          <button onClick={() => setExcluded(sports.filter(y => y !== x))} aria-label={`Seulement ${x}`}
            className="mt-0.5 text-[10px] leading-none text-faint hover:text-ink">seul</button>
        </span>
      ))}
      {hasLive && (
        <>
          <span className="mx-1 mt-1.5 h-5 w-px bg-line" aria-hidden />
          <button aria-pressed={live} onClick={() => setLive(!live)} title="Compter ou non les paris pris en live"
            className={`pill shrink-0 px-3 py-1.5 text-xs ${live ? '' : 'line-through opacity-60'}`}>● Live</button>
        </>
      )}
    </div>
  )

  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      {masked && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-raised px-3 py-2 text-xs text-muted">
          <span>
            Masqué : {[hiddenSeasons.length ? `saisons ${hiddenSeasons.join(', ')}` : null, resetDate ? `paris avant le ${resetDate.split('-').reverse().join('/')} (remise à zéro)` : null].filter(Boolean).join(' · ')}
          </span>
          <button onClick={() => setShowAll(true)} className="text-ink underline underline-offset-2">Tout afficher</button>
        </div>
      )}
      {showAll && (hiddenSeasons.length > 0 || !!resetDate) && (
        <div className="text-xs text-muted">Tout est affiché. <button onClick={() => setShowAll(false)} className="text-ink underline underline-offset-2">Réappliquer le masquage</button></div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {sportFirst && sportSelect}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
          {['Toutes', ...years].map(y => <button key={y} data-on={year === y} onClick={() => setYear(y)} className="pill shrink-0 px-3 py-1 font-mono text-xs">{y}</button>)}
        </div>
        {!sportFirst && sportSelect}
        {market && <div className="text-xs text-muted">Marché : <span className="text-ink">{market}</span> <button onClick={() => setMarket(null)} className="ml-1 underline underline-offset-2">retirer</button></div>}
      </div>

      {/* Héros : le bénéfice en gros chiffre, les indicateurs en grille à filets */}
      <section className="grid gap-x-10 gap-y-6 pt-2 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="label">{periodLabel}</div>
          <div className="hero-num mt-3 whitespace-nowrap text-[clamp(60px,12vw,156px)]">
            {heroSign}{heroInt}<span className="ml-[0.08em] text-[0.32em] text-muted" style={{ letterSpacing: 0 }}>€</span>
          </div>
          {s.count > 0 ? (
            <p className="mt-4 max-w-3xl text-sm text-muted">
              {since}{filterLabel ? ` (${filterLabel})` : ''}, {s.count} paris réglés ont rapporté <Signed v={s.profit} decimals={0} /> pour <span className="font-mono text-ink">{eur0(s.staked)}</span> misés.
              {year === 'Toutes' && bestYear && yearRows.length > 1 && <> Meilleure année : {bestYear.key} (<Signed v={bestYear.profit} decimals={0} />).</>}
              {s.adjustments !== 0 && <> Dont <span className="font-mono">{eur0(s.adjustments, true)}</span> d'ajustements.</>}
            </p>
          ) : <p className="mt-4 text-sm text-muted">Aucun pari réglé sur cette période.</p>}
          {(excluded.length > 0 || !live) && (
            <p className="mt-2 text-[11px] text-faint">
              {excluded.length > 0 && <>Sports comptés : {counted.join(', ') || 'aucun'} · non comptés : {excluded.join(', ')}</>}
              {excluded.length > 0 && !live && ' · '}
              {!live && 'paris en live non comptés'}
              {' '}<button onClick={() => { setExcluded([]); setLive(true) }} className="underline underline-offset-2 hover:text-ink">tout compter</button>
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 self-start border-t border-ink">
          {([
            ['ROI', <span className={s.roi == null ? '' : s.roi >= 0 ? 'text-win' : 'text-loss'}>{formatPct(s.roi, { signed: true })}</span>, `${eur0(s.staked)} misés`],
            ['Réussite', formatPct(s.hitRate), `${s.wins} / ${s.count} réglés`],
            ['CLV moyen', <span className="clv-grad text-accent" style={clvStyle(s.clvAvg)}>{formatPct(s.clvAvg, { signed: true })}</span>, s.clvMixed ? 'méthodes mélangées avant 2026' : s.clvCount ? `${formatPct(s.clvPositiveShare, { decimals: 0 })} à CLV positif` : 'aucune clôture'],
            ['Paris', String(betCount), `${s.refunded} remb. · ${s.pending} en cours`],
          ] as [string, ReactNode, string][]).map(([l, v, sub], i) => (
            <div key={l} className={`border-b border-line py-3 ${i % 2 ? 'pl-4' : 'pr-4'}`}>
              <dt className="label">{l}</dt>
              <dd className="mt-1 font-mono text-[26px] font-semibold leading-none">{v}</dd>
              <dd className="mt-1.5 text-[11px] text-faint">{sub}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-line pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label">Bénéfice cumulé, fin de mois</span>
          <span className="flex items-center gap-3">
            {year === 'Toutes' && years.length > 1 && (['continu', 'superpose'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`text-xs ${mode === m ? 'text-ink underline underline-offset-4' : 'text-muted hover:text-ink'}`}>{m === 'continu' ? 'Continu' : 'Années superposées'}</button>
            ))}
            <span className={`font-mono text-xs ${heroRounded > 0 ? 'text-win' : heroRounded < 0 ? 'text-loss' : 'text-muted'}`}>{heroSign}{heroInt}</span>
          </span>
        </div>
        {monthEnd.length ? <CumulativeChart points={monthEnd} mode={year === 'Toutes' ? mode : 'continu'} height={260} endLabel={false} /> : <div className="py-10 text-center text-sm text-muted">Pas encore de données.</div>}
      </section>

      <section className="border-t border-line pt-3">
        <h2 className="text-sm font-semibold">Derniers paris</h2>
        <ul className="mt-1">
          {lastBets.map(b => (
            <li key={b.id} className="grid grid-cols-[3rem_1fr_auto_auto] items-baseline gap-x-4 border-b border-line py-2 text-[13px] sm:grid-cols-[3.5rem_1fr_1fr_5rem_4.5rem_6rem]">
              <span className="font-mono text-muted">{b.bet_date.slice(8, 10)}.{b.bet_date.slice(5, 7)}</span>
              <span className="truncate">{b.selection}</span>
              <span className="hidden truncate text-muted sm:block">{opponentOf(b)}</span>
              <span className="hidden text-right font-mono sm:block">{eur0(Number(b.stake))}</span>
              <span className="text-right font-mono">{formatNum(Number(b.odds), 3)}</span>
              <span className="text-right"><BetResultAmount b={b} /></span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4">
        <Panel title="Année par année" sub="Cliquez une ligne pour sélectionner l'année." flush>
          <SummaryTable rows={yearRows} total={{ ...allYears, key: 'total', label: 'Total' }} columns={['n', 'staked', 'avgStake', 'avgOdds', 'hit', 'profit', 'roi', 'clv']}
            selected={year} onPick={k => setYear(year === k ? 'Toutes' : k)} />
        </Panel>
      </div>

      <Panel title="Bénéfice par mois">
        {months.length ? <MonthlyBars months={months} height={190} /> : <div className="py-8 text-center text-sm text-muted">Pas encore de données.</div>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Par type de marché" sub="Cliquez une ligne pour filtrer la page." flush>
          <SummaryTable rows={marketRows} columns={['n', 'staked', 'profit', 'roi']} selected={market} onPick={k => setMarket(market === k ? null : k as Market)} />
        </Panel>
        <Panel title="Par sport" sub="Cliquez une ligne pour compter ou non ce sport." flush>
          <SummaryTable rows={sportRows.map(r => excluded.includes(r.key) ? { ...r, label: <span className="text-faint line-through">{r.label}</span> } : r)} columns={['n', 'staked', 'profit', 'roi']} onPick={toggleSport} />
        </Panel>
      </div>

      <Panel title="Selon la cote de clôture" flush>
        <SummaryTable rows={clvRows} columns={['n', 'hit', 'profit', 'roi']} />
      </Panel>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Historique des paris</h2>
        <BetTable
          bets={filtered.filter(b => result === 'Tous' || b.result === result)}
          showPortfolio={false}
          filename={`bilan-${portfolio}${year !== 'Toutes' ? `-${year}` : ''}`}
          toolbarExtra={
            <>
              <select value={market ?? ''} onChange={e => setMarket((e.target.value || null) as Market | null)} className="field px-2 py-1.5 text-xs" aria-label="Type de marché">
                <option value="">Tous les marchés</option>
                {[...new Set(base.map(b => b.market ?? 'Autre'))].sort().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={result} onChange={e => setResult(e.target.value as BetResult | 'Tous')} className="field px-2 py-1.5 text-xs" aria-label="Résultat">
                <option value="Tous">Tous les résultats</option>
                {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <SportChecklist sports={sports} excluded={excluded} onChange={setExcluded} live={live} onLive={setLive} hasLive={hasLive} />
            </>
          }
        />
      </div>

      <details className="panel px-4 py-3 text-sm text-muted">
        <summary className="cursor-pointer text-ink">Définitions</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b className="text-ink">Paris réglés</b> : Gagnant, Perdant, 1/2 Gagnant, 1/2 Perdant. Remboursé et En cours sont exclus du misé, du ROI et du taux de réussite.</li>
          <li><b className="text-ink">Bénéfice</b> : Gagnant = mise × (cote − 1) ; 1/2 Gagnant = mise × (cote + 1)/2 − mise ; Perdant = −mise ; 1/2 Perdant = −mise/2.</li>
          <li><b className="text-ink">ROI</b> = (bénéfice des paris + ajustements) ÷ total misé sur les paris réglés. Les retraits n'entrent jamais dans le bénéfice ni le ROI.</li>
          <li><b className="text-ink">Taux de réussite</b> = (Gagnant + 1/2 Gagnant) ÷ paris réglés.</li>
          <li><b className="text-ink">CLV</b> : cote prise ÷ cote de clôture − 1 pour les nouveaux paris ; l'historique 2024–2025 garde sa valeur de l'Excel (cote ÷ (clôture × 1,05) − 1).</li>
          <li><b className="text-ink">Vu pas pris</b> : jamais dans ce bilan ; leur bilan théorique est dans leur onglet.</li>
          <li><b className="text-ink">Masquage</b> : les saisons masquées (Réglages) et la date de remise à zéro du portefeuille ne suppriment rien, elles filtrent l'affichage.</li>
        </ul>
      </details>
    </main>
  )
}
