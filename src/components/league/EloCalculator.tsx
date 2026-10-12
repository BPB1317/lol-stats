import { useState, useMemo, Fragment } from 'react'
import { seriesProbs, type SeriesProbs } from '@/lib/seriesOdds'

// Marchés affichés comme sur les books : chaque ligne = un marché, A à gauche, B à droite (somme = 100 %)
type Side = { key: keyof SeriesProbs; hdp?: string }
const SERIES_BLOCKS: { title: string; rows: { label: string; a: Side; b: Side }[] }[] = [
  {
    title: 'BO3',
    rows: [
      { label: 'Vainqueur', a: { key: 'bo3Win' }, b: { key: 'bo3Win' } },
      { label: 'Hdp 1.5', a: { key: 'bo3M15', hdp: '−1.5' }, b: { key: 'bo3P15', hdp: '+1.5' } },
      { label: 'Hdp 1.5', a: { key: 'bo3P15', hdp: '+1.5' }, b: { key: 'bo3M15', hdp: '−1.5' } },
    ],
  },
  {
    title: 'BO5',
    rows: [
      { label: 'Vainqueur', a: { key: 'bo5Win' }, b: { key: 'bo5Win' } },
      { label: 'Hdp 1.5', a: { key: 'bo5M15', hdp: '−1.5' }, b: { key: 'bo5P15', hdp: '+1.5' } },
      { label: 'Hdp 1.5', a: { key: 'bo5P15', hdp: '+1.5' }, b: { key: 'bo5M15', hdp: '−1.5' } },
      { label: 'Hdp 2.5', a: { key: 'bo5M25', hdp: '−2.5' }, b: { key: 'bo5P25', hdp: '+2.5' } },
      { label: 'Hdp 2.5', a: { key: 'bo5P25', hdp: '+2.5' }, b: { key: 'bo5M25', hdp: '−2.5' } },
    ],
  },
]

function OddsCell({ p, hdp }: { p: number; hdp?: string }) {
  const isFav = p >= 0.5
  return (
    <div
      className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
      style={{
        background: isFav ? 'hsl(142 70% 45% / 0.12)' : 'hsl(216 34% 16%)',
        border: `1px solid ${isFav ? 'hsl(142 70% 45% / 0.35)' : 'hsl(216 34% 22%)'}`,
      }}
    >
      <span className="text-sm font-semibold font-mono" style={{ color: 'hsl(217 91% 75%)' }}>{hdp ?? ''}</span>
      <div className="text-right">
        <div className="text-xl font-bold font-mono leading-tight" style={{ color: isFav ? '#4ade80' : 'white' }}>
          {(1 / p).toFixed(2)}
        </div>
        <div className="text-xs font-mono" style={{ color: 'hsl(215 20% 60%)' }}>
          {(p * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

interface CalcRating {
  team: { id: string; name: string }
  output: number
}

interface EloCalculatorProps {
  ratings: CalcRating[]
}

// P(team1 wins) = 1 / (1 + 10^(-delta/400))  — formule ELO standard (inverse du log-odds)
function eloWinProb(delta: number): number {
  return 1 / (1 + Math.pow(10, -delta / 400))
}

export function EloCalculator({ ratings }: EloCalculatorProps) {
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [manualDelta, setManualDelta] = useState('')
  const [mode, setMode] = useState<'teams' | 'manual'>('teams')
  const [sInput, setSInput] = useState('40')
  const s = parseFloat(sInput)

  const sorted = [...ratings].sort((a, b) => b.output - a.output)

  const team1 = sorted.find(r => r.team.id === team1Id)
  const team2 = sorted.find(r => r.team.id === team2Id)

  const delta = useMemo(() => {
    if (mode === 'manual') {
      const v = parseFloat(manualDelta)
      return isNaN(v) ? null : v
    }
    if (team1 && team2) return team1.output - team2.output
    return null
  }, [mode, manualDelta, team1, team2])

  const result = useMemo(() => {
    if (delta === null) return null
    const p1 = eloWinProb(delta)
    const p2 = 1 - p1
    return {
      p1, p2,
      odds1: 1 / p1,
      odds2: 1 / p2,
      label1: mode === 'teams' && team1 ? team1.team.name : 'Équipe A',
      label2: mode === 'teams' && team2 ? team2.team.name : 'Équipe B',
    }
  }, [delta, mode, team1, team2])

  const series = useMemo(() => {
    if (!result || !(s > 0)) return null
    return { a: seriesProbs(result.p1, s), b: seriesProbs(result.p2, s) }
  }, [result, s])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'hsl(216 34% 22%)' }}>
        <h2 className="text-sm font-semibold text-white">Calculateur de cotes</h2>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(216 34% 22%)' }}>
          {(['teams', 'manual'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 text-xs transition-colors"
              style={mode === m
                ? { background: 'hsl(216 34% 22%)', color: 'white' }
                : { background: 'transparent', color: 'hsl(215 20% 65%)' }
              }
            >
              {m === 'teams' ? 'Équipes' : 'Manuel'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Saisie */}
        {mode === 'teams' ? (
          <div className="flex items-center gap-3">
            <select
              value={team1Id}
              onChange={e => setTeam1Id(e.target.value)}
              className="flex-1 rounded-lg px-2 py-2 text-sm text-white outline-none"
              style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
            >
              <option value="">Équipe 1…</option>
              {sorted.map(r => (
                <option key={r.team.id} value={r.team.id} disabled={r.team.id === team2Id}>
                  {r.team.name} ({Math.round(r.output)})
                </option>
              ))}
            </select>
            <span className="text-sm font-bold" style={{ color: 'hsl(215 20% 65%)' }}>vs</span>
            <select
              value={team2Id}
              onChange={e => setTeam2Id(e.target.value)}
              className="flex-1 rounded-lg px-2 py-2 text-sm text-white outline-none"
              style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
            >
              <option value="">Équipe 2…</option>
              {sorted.map(r => (
                <option key={r.team.id} value={r.team.id} disabled={r.team.id === team1Id}>
                  {r.team.name} ({Math.round(r.output)})
                </option>
              ))}
            </select>
            {delta !== null && (
              <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'hsl(215 20% 65%)' }}>
                Δ = {delta > 0 ? '+' : ''}{Math.round(delta)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'hsl(215 20% 65%)' }}>
              Δ ELO (A − B)
            </label>
            <input
              type="number"
              value={manualDelta}
              onChange={e => setManualDelta(e.target.value)}
              placeholder="ex: 280"
              className="w-32 rounded-lg px-2 py-2 text-sm text-white outline-none text-center font-mono"
              style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
            />
            <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
              (positif = Équipe A favorite)
            </span>
          </div>
        )}

        {/* Résultats */}
        {result && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: result.label1, p: result.p1, odds: result.odds1 },
              { label: result.label2, p: result.p2, odds: result.odds2 },
            ].map((side, i) => {
              const isFav = side.p >= 0.5
              const pColor = isFav ? '#4ade80' : '#f87171'
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 space-y-2"
                  style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)' }}
                >
                  <div className="text-xs font-medium text-white truncate">{side.label}</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold font-mono" style={{ color: pColor }}>
                        {(side.p * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>Proba victoire</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-white">
                        {side.odds.toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>Cote décimale</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* BO3 / BO5 + handicaps, dérivés de la proba BO1 */}
        {result && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Séries & handicaps</h3>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                s =
                <input
                  type="number"
                  value={sInput}
                  onChange={e => setSInput(e.target.value)}
                  className="w-20 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center font-mono"
                  style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
                />
              </label>
            </div>
            {series ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {SERIES_BLOCKS.map(block => (
                  <div
                    key={block.title}
                    className="rounded-lg p-3"
                    style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)' }}
                  >
                    <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-2 items-center">
                      <div className="text-base font-bold" style={{ color: 'hsl(217 91% 70%)' }}>{block.title}</div>
                      <div className="text-sm font-semibold text-white text-center truncate">{result.label1}</div>
                      <div className="text-sm font-semibold text-white text-center truncate">{result.label2}</div>
                      {block.rows.map((row, i) => (
                        <Fragment key={i}>
                          <div className="text-sm font-semibold" style={{ color: 'hsl(215 20% 80%)' }}>{row.label}</div>
                          <OddsCell p={series.a[row.a.key]} hdp={row.a.hdp} />
                          <OddsCell p={series.b[row.b.key]} hdp={row.b.hdp} />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'hsl(215 20% 65%)' }}>s doit être &gt; 0.</div>
            )}
          </div>
        )}

        {!result && (
          <div className="text-center py-2 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
            {mode === 'teams'
              ? 'Sélectionnez deux équipes pour calculer les cotes.'
              : 'Saisissez un delta ELO pour calculer les cotes.'}
          </div>
        )}
      </div>
    </div>
  )
}
