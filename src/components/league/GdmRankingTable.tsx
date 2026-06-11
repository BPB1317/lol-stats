import { useState, Fragment } from 'react'
import type { GdmTeamRating, GdmStageBreakdown } from '@/types'
import { format } from 'date-fns'

function fmt(n: number | null, decimals = 0): string {
  if (n == null) return '—'
  const rounded = parseFloat(n.toFixed(decimals))
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

function fmtElo(n: number | null): string {
  if (n == null) return '—'
  return Math.round(n).toString()
}

function StageDetail({ stages, colSpan, teamId }: { stages: GdmStageBreakdown[]; colSpan: number; teamId: string }) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })
  }

  if (stages.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-10 py-3 text-xs" style={{ color: 'hsl(215 20% 65%)', background: 'hsl(222 47% 11%)' }}>
          Aucune donnée par stage disponible.
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={colSpan} style={{ background: 'hsl(222 47% 11%)', padding: 0 }}>
        <div className="px-10 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'hsl(215 20% 50%)' }}>
                <th className="text-left pb-1.5 font-normal w-4"></th>
                <th className="text-left pb-1.5 font-normal">Stage</th>
                <th className="text-right pb-1.5 font-normal">GDM</th>
                <th className="text-right pb-1.5 font-normal">GD@15</th>
                <th className="text-right pb-1.5 font-normal">Games</th>
                <th className="text-right pb-1.5 font-normal">Avg.Opp</th>
                <th className="text-right pb-1.5 font-normal">Perf</th>
              </tr>
            </thead>
            <tbody>
              {stages.map(s => {
                const gdmColor = s.gdm == null ? 'hsl(215 20% 65%)' : s.gdm > 0 ? '#4ade80' : '#f87171'
                const gd15Color = s.gd15 == null ? 'hsl(215 20% 65%)' : s.gd15 > 0 ? '#4ade80' : '#f87171'
                const isStageExpanded = expandedStages.has(s.stage)
                return (
                  <Fragment key={`${teamId}-${s.stage}`}>
                    <tr className="border-t" style={{ borderColor: 'hsl(216 34% 20%)' }}>
                      <td className="py-1 pr-2">
                        {s.matches.length > 0 && (
                          <button
                            onClick={() => toggleStage(s.stage)}
                            style={{ color: isStageExpanded ? 'hsl(217 91% 70%)' : 'hsl(215 20% 40%)', fontSize: '0.5rem' }}
                          >
                            {isStageExpanded ? '▼' : '▶'}
                          </button>
                        )}
                      </td>
                      <td className="py-1 pr-6">
                        <button
                          onClick={() => s.matches.length > 0 && toggleStage(s.stage)}
                          className="font-mono font-semibold text-white"
                          style={{ cursor: s.matches.length > 0 ? 'pointer' : 'default' }}
                        >
                          {s.stage}
                        </button>
                      </td>
                      <td className="py-1 pr-4 text-right font-mono font-semibold" style={{ color: gdmColor }}>{fmt(s.gdm)}</td>
                      <td className="py-1 pr-4 text-right font-mono font-semibold" style={{ color: gd15Color }}>{fmt(s.gd15)}</td>
                      <td className="py-1 pr-4 text-right font-mono" style={{ color: s.games > 0 ? 'hsl(217 91% 60%)' : 'hsl(215 20% 65%)' }}>
                        {s.games > 0 ? s.games : '—'}
                      </td>
                      <td className="py-1 pr-4 text-right font-mono" style={{ color: 'hsl(215 20% 65%)' }}>{fmtElo(s.avgOpp)}</td>
                      <td className="py-1 text-right font-mono" style={{ color: 'hsl(215 20% 65%)' }}>{fmtElo(s.perf)}</td>
                    </tr>
                    {isStageExpanded && s.matches.map((m, i) => (
                      <tr key={i} style={{ background: 'hsl(222 47% 13%)' }}>
                        <td />
                        <td className="py-1 pl-4 pr-2 font-mono text-white" style={{ color: 'hsl(215 20% 85%)' }}>
                          {format(new Date(m.date + 'T00:00:00'), 'dd/MM')}
                        </td>
                        <td className="py-1 pr-4 text-white" colSpan={2}>{m.opponentName}</td>
                        <td className="py-1 pr-4 text-right font-mono" style={{ color: 'hsl(217 91% 60%)' }}>{m.score ?? '—'}</td>
                        <td className="py-1 pr-4 text-right font-mono" style={{ color: 'hsl(215 20% 50%)' }}>{m.opponentInput}</td>
                        <td />
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

interface Props {
  ratings: GdmTeamRating[]
}

export function GdmRankingTable({ ratings }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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

  const COL_SPAN = 10

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
            <th className="py-3 px-3 text-left w-6"></th>
            <th className="py-3 px-3 text-left w-8">#</th>
            <th className="py-3 px-3 text-left">Équipe</th>
            <th className="py-3 px-3 text-right">Input</th>
            <th className="py-3 px-3 text-right">GDM</th>
            <th className="py-3 px-3 text-right">GD@15</th>
            <th className="py-3 px-3 text-right">Avg.Opp</th>
            <th className="py-3 px-3 text-center">Games</th>
            <th className="py-3 px-3 text-right">Perf</th>
            <th className="py-3 px-3 text-right">Output</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => {
            const isExpanded = expandedIds.has(r.team.id)
            const output = r.output ?? r.input
            const delta = r.output != null ? r.output - r.input : null
            const outputColor = r.output == null
              ? 'hsl(215 20% 65%)'
              : r.output > r.input ? '#4ade80' : r.output < r.input ? '#f87171' : 'hsl(215 20% 65%)'
            const gdmColor = r.gdm == null ? 'hsl(215 20% 65%)' : r.gdm > 0 ? '#4ade80' : '#f87171'
            const gd15Color = r.gd15 == null ? 'hsl(215 20% 65%)' : r.gd15 > 0 ? '#4ade80' : '#f87171'
            const rowBg = idx % 2 === 0 ? 'transparent' : 'hsl(222 47% 13%)'

            return (
              <Fragment key={r.team.id}>
                <tr
                  className="border-b"
                  style={{ borderColor: 'hsl(216 34% 22%)', background: rowBg }}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggle(r.team.id)}
                      className="w-4 h-4 flex items-center justify-center rounded transition-colors"
                      style={{ color: isExpanded ? 'hsl(217 91% 70%)' : 'hsl(215 20% 45%)', fontSize: '0.6rem' }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>{idx + 1}</td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggle(r.team.id)}
                      className="font-medium text-white hover:text-blue-400 transition-colors text-left"
                    >
                      {r.team.name}
                    </button>
                  </td>
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
                    {fmt(r.gdm)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs font-semibold" style={{ color: gd15Color }}>
                    {fmt(r.gd15)}
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
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-xs font-semibold" style={{ color: outputColor }}>
                        {Math.round(output)}
                      </span>
                      {delta != null && Math.abs(delta) >= 1 && (
                        <span className="text-xs font-medium" style={{ color: delta > 0 ? '#4ade80' : '#f87171' }}>
                          {delta > 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && <StageDetail stages={r.stages} colSpan={COL_SPAN} teamId={r.team.id} />}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
