import type { TeamRating } from '@/types'

interface RankingTableProps {
  ratings: TeamRating[]
  threshold: number
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.001) {
    return <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>—</span>
  }
  const color = delta > 0 ? '#4ade80' : '#f87171'
  const sign = delta > 0 ? '▲' : '▼'
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {sign} {Math.abs(delta * 100).toFixed(1)}%
    </span>
  )
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  const color = value >= 0.7 ? '#4ade80' : value >= 0.5 ? '#60a5fa' : '#f87171'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full w-20 overflow-hidden" style={{ background: 'hsl(216 34% 22%)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-white">{(value * 100).toFixed(1)}%</span>
    </div>
  )
}

function HistoryDots({ history, input }: { history: TeamRating['history']; input: number }) {
  const last8 = history.slice(0, 8)
  return (
    <div className="flex items-center gap-1">
      {last8.map((entry, i) => {
        const isWin = entry.note > input
        return (
          <div
            key={i}
            title={`${entry.opponentName}: ${(entry.note * 100).toFixed(0)}%`}
            className="w-2 h-2 rounded-full"
            style={{ background: isWin ? '#4ade80' : '#f87171' }}
          />
        )
      })}
    </div>
  )
}

export function RankingTable({ ratings, threshold }: RankingTableProps) {
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
            <th className="py-3 px-4 text-center">Évolution</th>
            <th className="py-3 px-4 text-center">Matchs</th>
            <th className="py-3 px-4 text-left">Historique (8 derniers)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => (
            <tr
              key={r.team.id}
              className="border-b transition-colors hover:opacity-90"
              style={{ borderColor: 'hsl(216 34% 22%)', background: idx % 2 === 0 ? 'transparent' : 'hsl(222 47% 13%)' }}
            >
              <td className="py-3 px-4" style={{ color: 'hsl(215 20% 65%)' }}>{idx + 1}</td>
              <td className="py-3 px-4 font-medium text-white">{r.team.name}</td>
              <td className="py-3 px-4 text-right">
                <span className="font-mono text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                  {(r.input * 100).toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <MiniBar value={r.output} max={threshold} />
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
                  ? <HistoryDots history={r.history} input={r.input} />
                  : <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
