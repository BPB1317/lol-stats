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
  const color = output >= input ? '#4ade80' : output < input ? '#f87171' : '#60a5fa'
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-xs font-mono text-white font-semibold" style={{ color }}>
        {Math.round(output)}
      </span>
    </div>
  )
}

function HistoryDots({ history, input }: { history: TeamRating['history']; input: number }) {
  const last8 = history.slice(0, 8)
  return (
    <div className="flex items-center gap-1">
      {last8.map((entry, i) => {
        const isWin = entry.performance > input
        return (
          <div
            key={i}
            title={`${entry.opponentName}: ${Math.round(entry.performance)} ELO (note: ${(entry.note * 100).toFixed(0)}%)`}
            className="w-2 h-2 rounded-full cursor-default"
            style={{ background: isWin ? '#4ade80' : '#f87171' }}
          />
        )
      })}
    </div>
  )
}

export function RankingTable({ ratings }: RankingTableProps) {
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
                  {Math.round(r.input)}
                </span>
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
