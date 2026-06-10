import type { GdmTeamRating } from '@/types'

function fmt(n: number | null, decimals = 0): string {
  if (n == null) return '—'
  const rounded = parseFloat(n.toFixed(decimals))
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

function fmtElo(n: number | null): string {
  if (n == null) return '—'
  return Math.round(n).toString()
}

interface Props {
  ratings: GdmTeamRating[]
}

export function GdmRankingTable({ ratings }: Props) {
  const sorted = [...ratings].sort((a, b) => {
    const ao = a.output ?? a.input
    const bo = b.output ?? b.input
    return bo - ao
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'hsl(215 20% 65%)' }}>
        Aucune équipe. Ajoutez des équipes dans l'onglet "Équipes".
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
            <th className="py-3 px-3 text-left w-8">#</th>
            <th className="py-3 px-3 text-left">Équipe</th>
            <th className="py-3 px-3 text-right">Input</th>
            <th className="py-3 px-3 text-right">GDM</th>
            <th className="py-3 px-3 text-right">GD@15</th>
            <th className="py-3 px-3 text-right">Avg.Opp</th>
            <th className="py-3 px-3 text-center">Games</th>
            <th className="py-3 px-3 text-right">Perf</th>
            <th className="py-3 px-3 text-right">Output</th>
            <th className="py-3 px-3 text-center">Évol.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => {
            const output = r.output ?? r.input
            const delta = r.output != null ? r.output - r.input : null
            const outputColor = r.output == null
              ? 'hsl(215 20% 65%)'
              : r.output > r.input ? '#4ade80' : r.output < r.input ? '#f87171' : 'hsl(215 20% 65%)'
            const gdmColor = r.gdm == null ? 'hsl(215 20% 65%)' : r.gdm > 0 ? '#4ade80' : '#f87171'
            const gd15Color = r.gd15 == null ? 'hsl(215 20% 65%)' : r.gd15 > 0 ? '#4ade80' : '#f87171'
            const rowBg = idx % 2 === 0 ? 'transparent' : 'hsl(222 47% 13%)'

            return (
              <tr
                key={r.team.id}
                className="border-b"
                style={{ borderColor: 'hsl(216 34% 22%)', background: rowBg }}
              >
                <td className="py-3 px-3 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>{idx + 1}</td>
                <td className="py-3 px-3 font-medium text-white">{r.team.name}</td>
                <td className="py-3 px-3 text-right">
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
                <td className="py-3 px-3 text-right font-mono text-xs font-semibold" style={{ color: gdmColor }}>
                  {fmt(r.gdm, 0)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs font-semibold" style={{ color: gd15Color }}>
                  {fmt(r.gd15, 0)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                  {fmtElo(r.avgOpp)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-xs" style={{ color: r.games > 0 ? 'hsl(217 91% 60%)' : 'hsl(215 20% 65%)' }}>
                  {r.games > 0 ? r.games : '—'}
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                  {fmtElo(r.perf)}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono text-xs font-semibold" style={{ color: outputColor }}>
                    {Math.round(output)}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  {delta == null ? (
                    <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>—</span>
                  ) : Math.abs(delta) < 1 ? (
                    <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>—</span>
                  ) : (
                    <span className="text-xs font-medium" style={{ color: delta > 0 ? '#4ade80' : '#f87171' }}>
                      {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
