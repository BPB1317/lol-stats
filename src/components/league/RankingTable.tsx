import { useState, Fragment } from 'react'
import { format } from 'date-fns'
import type { TeamRating } from '@/types'

interface RankingTableProps {
  ratings: TeamRating[]
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return <span className="text-xs" style={{ color: 'var(--color-muted)' }}>—</span>
  }
  const color = delta > 0 ? 'var(--color-win)' : 'var(--color-loss)'
  const sign = delta > 0 ? '▲' : '▼'
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {sign} {Math.abs(delta).toFixed(0)}
    </span>
  )
}

function EloDisplay({ input, output }: { input: number; output: number }) {
  const color = output > input ? 'var(--color-win)' : output < input ? 'var(--color-loss)' : 'var(--color-ink)'
  return (
    <span className="text-xs font-mono font-semibold" style={{ color }}>
      {Math.round(output)}
    </span>
  )
}

function HistoryDots({ history, input }: { history: TeamRating['history']; input: number }) {
  const last8 = history.slice(0, 8)
  return (
    <div className="flex items-center gap-1">
      {last8.map((entry, i) => (
        <div
          key={i}
          title={`${entry.opponentName}: ${Math.round(entry.performance)} ELO (note: ${(entry.note * 100).toFixed(0)}%)`}
          className="w-2 h-2 rounded-full cursor-default"
          style={{ background: entry.performance > input ? 'var(--color-win)' : 'var(--color-loss)' }}
        />
      ))}
    </div>
  )
}

function TeamDetail({ rating }: { rating: TeamRating }) {
  if (rating.history.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="px-8 py-3 text-xs" style={{ color: 'var(--color-muted)', background: 'var(--color-bg)' }}>
          Aucune performance enregistrée dans cette période.
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={9} style={{ background: 'var(--color-bg)', padding: 0 }}>
        <div className="px-8 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-muted)' }}>
                <th className="text-left pb-1 font-normal">#</th>
                <th className="text-left pb-1 font-normal">Date</th>
                <th className="text-left pb-1 font-normal">Adversaire</th>
                <th className="text-right pb-1 font-normal">Note</th>
                <th className="text-right pb-1 font-normal">Perf. ELO</th>
                <th className="text-center pb-1 font-normal">W/L</th>
              </tr>
            </thead>
            <tbody>
              {rating.history.map((entry, i) => (
                <tr key={entry.matchId + i}>
                  <td className="py-0.5 pr-3" style={{ color: 'var(--color-muted)' }}>{i + 1}</td>
                  <td className="py-0.5 pr-4 font-mono" style={{ color: 'var(--color-muted)' }}>
                    {format(new Date(entry.date + 'T00:00:00'), 'dd/MM/yy')}
                  </td>
                  <td className="py-0.5 pr-4 text-ink">{entry.opponentName}</td>
                  <td className="py-0.5 pr-4 text-right font-mono" style={{ color: 'var(--color-muted)' }}>
                    {(entry.note * 100).toFixed(0)}%
                  </td>
                  <td className="py-0.5 pr-4 text-right font-mono font-semibold" style={{ color: entry.performance > rating.input ? 'var(--color-win)' : entry.performance < rating.input ? 'var(--color-loss)' : 'var(--color-muted)' }}>
                    {Math.round(entry.performance)}
                  </td>
                  <td className="py-0.5 text-center font-bold text-xs" style={{ color: entry.won === true ? 'var(--color-win)' : entry.won === false ? 'var(--color-loss)' : 'var(--color-muted)' }}>
                    {entry.won === true ? 'W' : entry.won === false ? 'L' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

export function RankingTable({ ratings }: RankingTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const sorted = [...ratings].sort((a, b) => b.output - a.output)

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
        Aucune équipe dans cette ligue. Ajoutez des équipes dans l'onglet "Équipes".
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
            <th className="py-3 px-4 text-left w-8">#</th>
            <th className="py-3 px-4 text-left">Équipe</th>
            <th className="py-3 px-4 text-right">Input</th>
            <th className="py-3 px-4 text-right">Output</th>
            <th className="py-3 px-4 text-center">Évol.</th>
            <th className="py-3 px-4 text-center">Matchs</th>
            <th className="py-3 px-4 text-center">Avg.Opp</th>
            <th className="py-3 px-4 text-center">Note moy.</th>
            <th className="py-3 px-4 text-left">Historique</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => {
            const isExpanded = expandedIds.has(r.team.id)
            const rowBg = idx % 2 === 0 ? 'transparent' : 'var(--color-stripe)'

            return (
              <Fragment key={r.team.id}>
                <tr
                  className="border-b"
                  style={{ borderColor: 'var(--color-line)', background: rowBg }}
                >
                  <td className="py-3 px-4" style={{ color: 'var(--color-muted)' }}>{idx + 1}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setExpandedIds(prev => {
                        const next = new Set(prev)
                        if (isExpanded) next.delete(r.team.id)
                        else next.add(r.team.id)
                        return next
                      })}
                      className="font-medium text-ink hover:text-accent text-left transition-colors flex items-center gap-1"
                    >
                      <span className="text-xs" style={{ color: 'var(--color-muted)', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {r.team.name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                        {Math.round(r.input)}
                      </span>
                      {r.inputBoType && (
                        <span className="font-medium rounded px-1 py-px" style={{ fontSize: '0.6rem', lineHeight: '1.3', background: 'var(--color-raised)', color: 'var(--color-muted)' }}>
                          {r.inputBoType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <EloDisplay input={r.input} output={r.output} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <DeltaBadge delta={r.delta} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs font-mono" style={{ color: r.nbGames > 0 ? 'var(--color-ink)' : 'var(--color-muted)' }}>
                      {r.nbGames}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {r.avgOpp != null ? Math.round(r.avgOpp) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs" style={{ color: r.avgNote != null ? (r.avgNote >= 0.5 ? 'var(--color-win)' : 'var(--color-loss)') : 'var(--color-muted)' }}>
                    {r.avgNote != null ? `${(r.avgNote * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {r.nbGames > 0
                      ? <HistoryDots history={r.history} input={r.input} />
                      : <span className="text-xs" style={{ color: 'var(--color-muted)' }}>—</span>
                    }
                  </td>
                </tr>
                {isExpanded && <TeamDetail rating={r} />}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
