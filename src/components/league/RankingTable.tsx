import { useState, Fragment } from 'react'
import { format } from 'date-fns'
import type { TeamRating } from '@/types'

interface RankingTableProps {
  ratings: TeamRating[]
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>—</span>
  }
  const color = delta > 0 ? '#4ade80' : '#f87171'
  const sign = delta > 0 ? '▲' : '▼'
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {sign} {Math.abs(delta).toFixed(0)}
    </span>
  )
}

function EloDisplay({ input, output }: { input: number; output: number }) {
  const color = output > input ? '#4ade80' : output < input ? '#f87171' : '#60a5fa'
  return (
    <span className="text-xs font-mono font-semibold" style={{ color }}>
      {Math.round(output)}
    </span>
  )
}

function HistoryDots({ history }: { history: TeamRating['history'] }) {
  const last8 = history.slice(0, 8)
  return (
    <div className="flex items-center gap-1">
      {last8.map((entry, i) => (
        <div
          key={i}
          title={`${entry.opponentName}: ${Math.round(entry.performance)} ELO (note: ${(entry.note * 100).toFixed(0)}%)`}
          className="w-2 h-2 rounded-full cursor-default"
          style={{ background: entry.won ? '#4ade80' : '#f87171' }}
        />
      ))}
    </div>
  )
}

function TeamDetail({ rating }: { rating: TeamRating }) {
  if (rating.history.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-8 py-3 text-xs" style={{ color: 'hsl(215 20% 65%)', background: 'hsl(222 47% 11%)' }}>
          Aucune performance enregistrée dans cette période.
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={7} style={{ background: 'hsl(222 47% 11%)', padding: 0 }}>
        <div className="px-8 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'hsl(215 20% 65%)' }}>
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
                  <td className="py-0.5 pr-3" style={{ color: 'hsl(215 20% 65%)' }}>{i + 1}</td>
                  <td className="py-0.5 pr-4 font-mono" style={{ color: 'hsl(215 20% 65%)' }}>
                    {format(new Date(entry.date + 'T00:00:00'), 'dd/MM/yy')}
                  </td>
                  <td className="py-0.5 pr-4 text-white">{entry.opponentName}</td>
                  <td className="py-0.5 pr-4 text-right font-mono" style={{ color: 'hsl(215 20% 65%)' }}>
                    {(entry.note * 100).toFixed(0)}%
                  </td>
                  <td className="py-0.5 pr-4 text-right font-mono font-semibold" style={{ color: entry.won ? '#4ade80' : '#f87171' }}>
                    {Math.round(entry.performance)}
                  </td>
                  <td className="py-0.5 text-center font-bold text-xs" style={{ color: entry.won ? '#4ade80' : '#f87171' }}>
                    {entry.won ? 'W' : 'L'}
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
      <div className="text-center py-16" style={{ color: 'hsl(215 20% 65%)' }}>
        Aucune équipe dans cette ligue. Ajoutez des équipes dans l'onglet "Équipes".
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
            <th className="py-3 px-4 text-left w-8">#</th>
            <th className="py-3 px-4 text-left">Équipe</th>
            <th className="py-3 px-4 text-right">Input</th>
            <th className="py-3 px-4 text-right">Output</th>
            <th className="py-3 px-4 text-center">Évol.</th>
            <th className="py-3 px-4 text-center">Matchs</th>
            <th className="py-3 px-4 text-left">Historique</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => {
            const isExpanded = expandedIds.has(r.team.id)
            const rowBg = idx % 2 === 0 ? 'transparent' : 'hsl(222 47% 13%)'

            return (
              <Fragment key={r.team.id}>
                <tr
                  className="border-b"
                  style={{ borderColor: 'hsl(216 34% 22%)', background: rowBg }}
                >
                  <td className="py-3 px-4" style={{ color: 'hsl(215 20% 65%)' }}>{idx + 1}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setExpandedIds(prev => {
                        const next = new Set(prev)
                        isExpanded ? next.delete(r.team.id) : next.add(r.team.id)
                        return next
                      })}
                      className="font-medium text-white hover:text-blue-400 text-left transition-colors flex items-center gap-1"
                    >
                      <span className="text-xs" style={{ color: 'hsl(215 20% 65%)', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {r.team.name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-mono text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                        {Math.round(r.input)}
                      </span>
                      {r.inputBoType && (
                        <span className="font-medium rounded px-1 py-px" style={{ fontSize: '0.6rem', lineHeight: '1.3', background: 'hsl(217 91% 60% / 0.12)', color: 'hsl(217 91% 70%)' }}>
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
                    <span className="text-xs font-mono" style={{ color: r.nbGames > 0 ? 'hsl(217 91% 60%)' : 'hsl(215 20% 65%)' }}>
                      {r.nbGames}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {r.nbGames > 0
                      ? <HistoryDots history={r.history} />
                      : <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>—</span>
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
