// Écran « Bilan » d'un portefeuille (commun ou Kelicful) — reprend le tableau de bord de l'Excel.
// Règles : paris réglés = G, P, ½G, ½P ; ROI = (bénéfice + ajustements) ÷ misé ; « Vu pas pris » exclus ;
// saisons masquées et date de remise à zéro appliquées sans rien supprimer.
import { useState, type ReactNode } from 'react'
import type { Bet, BetResult, Market, MoneyMove, Portfolio } from '@/types/betting'
import { RESULTS } from '@/types/betting'
import { summarize, groupSummaries, cumulative, visible, formatEur, formatPct, isSettled, type Summary } from '@/lib/betStats'
import { CumulativeChart, MonthlyBars } from '@/components/charts/Charts'
import { BetTable, Signed } from '@/components/bets/BetTable'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const eur0 = (n: number, signed = false) => formatEur(n, { signed, decimals: 0 })

interface Props {
  portfolio: Portfolio
  bets: Bet[]
  moves: MoneyMove[]
  hiddenSeasons: number[]
  resetDate: string | null
  sportFirst?: boolean          // espace Kelicful : filtre Sport mis en avant
}

function Kpi({ label, value, sub, note }: { label: string; value: ReactNode; sub?: ReactNode; note?: ReactNode }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-tight md:text-[26px]">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
      {note && <div className="mt-0.5 text-[11px] text-faint">{note}</div>}
    </div>
  )
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
  const [sport, setSport] = useState<string>('Tous')
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
  const inYear = (d: string) => year === 'Toutes' || d.startsWith(year)
  const bySportMarket = (b: Bet) => (sport === 'Tous' || b.sport === sport) && (!market || b.market === market)
  // Les ajustements n'ont ni sport ni marché : ils ne comptent que sans ces filtres
  const movesOn = sport === 'Tous' && !market

  const filtered = base.filter(b => inYear(b.bet_date) && bySportMarket(b))
  const filteredMoves = movesOn ? baseMoves.filter(m => inYear(m.move_date)) : []
  const s = summarize(filtered, filteredMoves)

  const yearRows: Row[] = groupSummaries(base.filter(bySportMarket), movesOn ? baseMoves : [], d => d.slice(0, 4)).map(g => ({ ...g, label: g.key }))
  const allYears = summarize(base.filter(bySportMarket), movesOn ? baseMoves : [])
  const bestYear = [...yearRows].sort((a, b) => b.profit - a.profit)[0]
  const months = groupSummaries(filtered, filteredMoves, d => d.slice(0, 7)).map(g => ({ month: g.key, pl: g.profit, staked: g.staked, n: g.count, roi: g.roi ?? 0 }))
  const curve = cumulative(filtered, filteredMoves)

  const yearScoped = base.filter(b => inYear(b.bet_date))
  const marketRows: Row[] = groupSummaries(yearScoped.filter(b => sport === 'Tous' || b.sport === sport), [], (_d, b) => b?.market ?? 'Autre').map(g => ({ ...g, label: g.key })).sort((a, b) => b.count - a.count)
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
  const filterLabel = [sport !== 'Tous' ? sport : null, market].filter(Boolean).join(', ')

  const sportSelect = (
    <div className="flex flex-wrap gap-1.5">
      {['Tous', ...sports].map(x => <button key={x} data-on={sport === x} onClick={() => setSport(x)} className="pill shrink-0 px-3 py-1.5 text-xs">{x}</button>)}
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

      <div className="flex flex-col gap-2">
        {sportFirst && sportSelect}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
          {['Toutes', ...years].map(y => <button key={y} data-on={year === y} onClick={() => setYear(y)} className="pill shrink-0 px-3 py-1.5 font-mono text-xs">{y}</button>)}
        </div>
        {!sportFirst && sportSelect}
        {market && <div className="text-xs text-muted">Marché : <span className="text-ink">{market}</span> <button onClick={() => setMarket(null)} className="ml-1 underline underline-offset-2">retirer</button></div>}
      </div>

      {s.count > 0 ? (
        <p className="max-w-4xl text-sm text-muted">
          {since}{filterLabel ? ` (${filterLabel})` : ''}, <span className="text-ink">{s.count} paris</span> ont rapporté <Signed v={s.profit} decimals={0} /> pour <span className="font-mono text-ink">{eur0(s.staked)}</span> misés, soit un ROI de <span className="font-mono text-ink">{formatPct(s.roi, { signed: true })}</span>.
          {year === 'Toutes' && bestYear && yearRows.length > 1 && <> La meilleure année est {bestYear.key} (<Signed v={bestYear.profit} decimals={0} />).</>}
          {s.adjustments !== 0 && <> Dont <span className="font-mono">{eur0(s.adjustments, true)}</span> d'ajustements.</>}
        </p>
      ) : (
        <p className="text-sm text-muted">Aucun pari réglé sur cette période.</p>
      )}

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        <Kpi label="Bénéfice" value={<Signed v={s.profit} decimals={0} />} sub={s.adjustments ? `dont ${eur0(s.adjustments, true)} d'ajustements` : 'paris réglés'} />
        <Kpi label="ROI" value={<span className="font-mono">{formatPct(s.roi, { signed: true })}</span>} sub={`${eur0(s.staked)} misés`} />
        <Kpi label="Taux de réussite" value={<span className="font-mono">{formatPct(s.hitRate)}</span>} sub={`${s.wins} gagnants sur ${s.count} réglés`} />
        <Kpi label="CLV moyen" value={<span className="font-mono">{formatPct(s.clvAvg, { signed: true })}</span>}
          sub={s.clvCount ? `${formatPct(s.clvPositiveShare, { decimals: 0 })} de paris à CLV positif` : 'aucune cote de clôture'}
          note={s.clvMixed ? 'Méthodes mélangées : cote/(clôture×1,05)−1 avant 2026, cote/clôture−1 ensuite' : undefined} />
      </section>

      <div className="grid gap-4">
        <Panel title="Bénéfice cumulé" right={year === 'Toutes' && years.length > 1 && (
          <div className="flex gap-1">{(['continu', 'superpose'] as const).map(m => <button key={m} data-on={mode === m} onClick={() => setMode(m)} className="pill px-2.5 py-1 text-xs">{m === 'continu' ? 'Continu' : 'Années superposées'}</button>)}</div>
        )}>
          {curve.length ? <CumulativeChart points={curve} mode={year === 'Toutes' ? mode : 'continu'} height={250} /> : <div className="py-10 text-center text-sm text-muted">Pas encore de données.</div>}
        </Panel>
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
        <Panel title="Par sport" sub="Cliquez une ligne pour filtrer la page." flush>
          <SummaryTable rows={sportRows} columns={['n', 'staked', 'profit', 'roi']} selected={sport === 'Tous' ? null : sport} onPick={k => setSport(sport === k ? 'Tous' : k)} />
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
              <select value={sport} onChange={e => setSport(e.target.value)} className="field px-2 py-1.5 text-xs" aria-label="Sport">
                <option value="Tous">Tous les sports</option>
                {sports.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
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
