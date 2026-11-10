// Tableau dense des paris (DA Back-office) : recherche, densité, export CSV, pagination.
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Bet } from '@/types/betting'
import { formatEur, formatPct, profit, theoreticalProfit } from '@/lib/betStats'
import { downloadCsv } from '@/lib/csv'
import { ResultLabel } from './ResultButtons'

const PAGE = 50
type SortKey = 'date' | 'stake' | 'odds' | 'clv' | 'profit'
const fmtDate = (d: string) => d.split('-').reverse().join('/')

function Ico({ d }: { d: string }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Th({ k, sort, onSort, right, children }: { k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; right?: boolean; children: ReactNode }) {
  return (
    <th className={`font-medium ${right ? 'text-right' : ''}`}>
      <button onClick={() => onSort(k)} className="hover:text-ink">{children}{sort.key === k ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button>
    </th>
  )
}

export function Signed({ v, decimals = 2 }: { v: number; decimals?: number }) {
  const r = Math.round(v * 10 ** decimals) / 10 ** decimals // couleur et signe suivent le montant affiché
  return <span className={`font-mono ${r > 0 ? 'text-win' : r < 0 ? 'text-loss' : ''}`}>{formatEur(v, { signed: true, decimals })}</span>
}

interface Props {
  bets: Bet[]
  theoretical?: boolean          // onglet Vu pas pris : bénéfice théorique
  showPortfolio?: boolean
  toolbarExtra?: ReactNode
  filename?: string
  rowAction?: (b: Bet) => ReactNode
}

export function BetTable({ bets, theoretical = false, showPortfolio = true, toolbarExtra, filename = 'paris', rowAction }: Props) {
  const [q, setQ] = useState('')
  const [dense, setDense] = useState(true)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 })
  const location = useLocation()

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const rows = s ? bets.filter(b => `${b.game ?? ''} ${b.selection} ${b.sport} ${b.league ?? ''} ${b.note ?? ''}`.toLowerCase().includes(s)) : bets
    const val = (b: Bet): number | string => sort.key === 'date' ? b.bet_date + b.created_at : sort.key === 'stake' ? Number(b.stake) : sort.key === 'odds' ? Number(b.odds) : sort.key === 'clv' ? Number(b.clv ?? -Infinity) : (theoretical ? theoreticalProfit(b) : profit(b))
    return [...rows].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir })
  }, [bets, q, sort, theoretical])
  const sortBy = (key: SortKey) => { setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 })); setPage(0) }
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages - 1)
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE)
  const py = dense ? 'py-1.5' : 'py-3'
  const pl = (b: Bet) => theoretical ? theoreticalProfit(b) : profit(b)

  const exportCsv = () => downloadCsv(`${filename}.csv`,
    ['Date', 'Sport', 'Match', 'Position', 'Marché', 'Portefeuille', 'Statut', 'Mise', 'Cote', 'Clôture', 'CLV', 'Résultat', theoretical ? 'Bénéfice théorique' : 'Bénéfice', 'Placé par', 'Note'],
    filtered.map(b => [b.bet_date, b.sport, b.game, b.selection, b.market, b.portfolio, b.status, Number(b.stake), Number(b.odds), b.closing_odds, b.clv, b.result, Math.round(pl(b) * 100) / 100, b.placed_by, b.note]))

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2 text-[13px]">
        {toolbarExtra}
        <button onClick={() => setDense(d => !d)} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted hover:bg-raised hover:text-ink"><Ico d="M4 6h16M4 12h16M4 18h16" />Densité : {dense ? 'serrée' : 'normale'}</button>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted hover:bg-raised hover:text-ink"><Ico d="M12 4v11M7 10l5 5 5-5M5 20h14" />Export CSV</button>
        <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} className="field ml-auto w-full px-3 py-1.5 text-xs sm:w-60" placeholder="Rechercher un match, une position…" />
      </div>
      {/* Mobile : liste compacte */}
      <ul className="md:hidden">
        {rows.map(b => (
          <li key={b.id} className="border-b border-line px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">{b.selection}</span>
              <span className="shrink-0 text-sm">{b.result === 'En cours' ? <span className="text-faint">—</span> : <Signed v={pl(b)} />}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
              <span className="min-w-0 truncate">{fmtDate(b.bet_date)}{b.game ? ` · ${b.game}` : ''}</span>
              <span className="shrink-0 font-mono">{formatEur(Number(b.stake), { decimals: 0 })} · {Number(b.odds).toFixed(2)}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <ResultLabel result={b.result} />
              <span className="flex items-center">{rowAction?.(b)}<Link to={`${location.pathname}?pari=${b.id}`} className="ml-1 rounded px-1.5 py-1 text-xs text-faint hover:text-ink">Modifier</Link></span>
            </div>
          </li>
        ))}
        {!rows.length && <li className="px-4 py-8 text-center text-sm text-muted">Aucun pari.</li>}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-[13px] [&_td]:pr-3 [&_th]:pr-3">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-2 font-medium"><button onClick={() => sortBy('date')} className="hover:text-ink">Date{sort.key === 'date' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button></th><th className="font-medium">Sport</th><th className="font-medium">Position</th><th className="font-medium">Match</th>
              {showPortfolio && <th className="font-medium">Portef.</th>}
              <Th k="stake" sort={sort} onSort={sortBy} right>Mise</Th><Th k="odds" sort={sort} onSort={sortBy} right>Cote</Th><th className="text-right font-medium">Clôture</th><Th k="clv" sort={sort} onSort={sortBy} right>CLV</Th>
              <th className="pl-4 font-medium">Résultat</th><th className="px-4 text-right font-medium"><button onClick={() => sortBy('profit')} className="hover:text-ink">{theoretical ? 'Théorique' : 'Bénéfice'}{sort.key === 'profit' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button></th><th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} className="border-b border-line hover:bg-stripe">
                <td className={`whitespace-nowrap px-4 font-mono text-muted ${py}`}>{fmtDate(b.bet_date)}</td>
                <td className="text-muted">{b.sport}</td>
                <td className="font-medium">{b.selection}</td>
                <td className="max-w-[260px] truncate text-muted">{b.game}</td>
                {showPortfolio && <td className="text-muted">{b.portfolio === 'commun' ? 'Commun' : 'Kelicful'}</td>}
                <td className="text-right font-mono">{formatEur(Number(b.stake))}</td>
                <td className="text-right font-mono">{Number(b.odds).toFixed(2)}</td>
                <td className="text-right font-mono text-muted">{b.closing_odds ? Number(b.closing_odds).toFixed(2) : '—'}</td>
                <td className={`text-right font-mono ${b.clv == null ? 'text-faint' : Number(b.clv) > 0 ? 'text-win' : Number(b.clv) < 0 ? 'text-loss' : ''}`}>{b.clv == null ? '—' : formatPct(Number(b.clv), { signed: true })}</td>
                <td className="pl-4"><ResultLabel result={b.result} /></td>
                <td className="px-4 text-right">{b.result === 'En cours' ? <span className="text-faint">—</span> : <Signed v={pl(b)} />}</td>
                <td className="whitespace-nowrap pr-3 text-right">
                  {rowAction?.(b)}
                  <Link to={`${location.pathname}?pari=${b.id}`} className="ml-1 rounded px-1.5 py-1 text-xs text-faint hover:bg-raised hover:text-ink">Modifier</Link>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={12} className="px-4 py-8 text-center text-muted">Aucun pari.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 text-xs text-muted">
        <span>{filtered.length ? `${current * PAGE + 1}–${Math.min(filtered.length, (current + 1) * PAGE)} sur ${filtered.length}` : '0 pari'}</span>
        <span className="flex gap-3">
          <button disabled={current === 0} onClick={() => setPage(current - 1)} className="hover:text-ink disabled:opacity-40">‹ Précédent</button>
          <button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="hover:text-ink disabled:opacity-40">Suivant ›</button>
        </span>
      </div>
    </section>
  )
}
