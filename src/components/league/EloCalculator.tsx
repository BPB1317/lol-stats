import { useState, Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSettings } from '@/hooks/useBetting'
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

// Une cote cliquable ouvre le formulaire de pari prérempli (« Prendre ce pari »)
function OddsCell({ p, hdp, href }: { p: number; hdp?: string; href?: string }) {
  const isFav = p >= 0.5
  const Tag = href ? Link : 'div'
  return (
    <Tag
      to={href ?? ''}
      title={href ? 'Prendre ce pari' : undefined}
      className={`rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${href ? 'hover:brightness-125' : ''}`}
      style={{
        background: isFav ? 'color-mix(in srgb, var(--color-win) 12%, transparent)' : 'var(--color-line)',
        border: `1px solid ${isFav ? 'color-mix(in srgb, var(--color-win) 35%, transparent)' : 'var(--color-line)'}`,
      }}
    >
      <span className="text-sm font-semibold font-mono" style={{ color: 'var(--color-muted)' }}>{hdp ?? ''}</span>
      <div className="text-right">
        <div className="text-xl font-bold font-mono leading-tight" style={{ color: isFav ? 'var(--color-win)' : 'var(--color-ink)' }}>
          {(1 / p).toFixed(2)}
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          {(p * 100).toFixed(1)}%
        </div>
      </div>
    </Tag>
  )
}

interface CalcRating {
  team: { id: string; name: string }
  output: number
}

interface EloCalculatorProps {
  ratings: CalcRating[]
  defaultMode?: 'teams' | 'manual'
  leagueName?: string             // pour préremplir le pari pris depuis le calculateur
}

// P(team1 wins) = 1 / (1 + 10^(-delta/400))  — formule ELO standard (inverse du log-odds)
function eloWinProb(delta: number): number {
  return 1 / (1 + Math.pow(10, -delta / 400))
}

export function EloCalculator({ ratings, defaultMode = 'teams', leagueName }: EloCalculatorProps) {
  const { settings } = useSettings()
  const { pathname } = useLocation()
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [manualDelta, setManualDelta] = useState('')
  const [mode, setMode] = useState<'teams' | 'manual'>(defaultMode)
  const [sEdit, setSInput] = useState<string | null>(null)
  const sInput = sEdit ?? String(settings.series_concentration) // valeur des Réglages tant qu'on ne la change pas
  const s = parseFloat(sInput)

  const sorted = [...ratings].sort((a, b) => b.output - a.output)

  const team1 = sorted.find(r => r.team.id === team1Id)
  const team2 = sorted.find(r => r.team.id === team2Id)

  // Calculs instantanés : pas de mémoïsation nécessaire
  const manual = parseFloat(manualDelta)
  const delta = mode === 'manual'
    ? (isNaN(manual) ? null : manual)
    : (team1 && team2 ? team1.output - team2.output : null)

  const result = delta === null ? null : (() => {
    const p1 = eloWinProb(delta)
    const p2 = 1 - p1
    return {
      p1, p2,
      odds1: 1 / p1,
      odds2: 1 / p2,
      label1: mode === 'teams' && team1 ? team1.team.name : 'Équipe A',
      label2: mode === 'teams' && team2 ? team2.team.name : 'Équipe B',
    }
  })()

  const takeHref = (teamName: string, hdp: string | undefined, odds: number) => {
    if (mode !== 'teams' || !team1 || !team2) return undefined
    const q = new URLSearchParams({
      pari: 'nouveau', game: `${team1.team.name} vs ${team2.team.name}`, selection: hdp ? `${teamName} ${hdp.replace('−', '-')}` : teamName,
      odds: odds.toFixed(2), sport: 'E-sport', ...(leagueName ? { league: leagueName } : {}),
    })
    return `${pathname}?${q}`
  }

  const series = result && s > 0 ? { a: seriesProbs(result.p1, s), b: seriesProbs(result.p2, s) } : null

  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-line)' }}>
        <h2 className="text-sm font-semibold text-ink">Calculateur de cotes</h2>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-line)' }}>
          {(['teams', 'manual'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 text-xs transition-colors"
              style={mode === m
                ? { background: 'var(--color-line)', color: 'var(--color-ink)' }
                : { background: 'transparent', color: 'var(--color-muted)' }
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
              className="flex-1 rounded-lg px-2 py-2 text-sm text-ink outline-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
            >
              <option value="">Équipe 1…</option>
              {sorted.map(r => (
                <option key={r.team.id} value={r.team.id} disabled={r.team.id === team2Id}>
                  {r.team.name} ({Math.round(r.output)})
                </option>
              ))}
            </select>
            <span className="text-sm font-bold" style={{ color: 'var(--color-muted)' }}>vs</span>
            <select
              value={team2Id}
              onChange={e => setTeam2Id(e.target.value)}
              className="flex-1 rounded-lg px-2 py-2 text-sm text-ink outline-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
            >
              <option value="">Équipe 2…</option>
              {sorted.map(r => (
                <option key={r.team.id} value={r.team.id} disabled={r.team.id === team1Id}>
                  {r.team.name} ({Math.round(r.output)})
                </option>
              ))}
            </select>
            {delta !== null && (
              <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
                Δ = {delta > 0 ? '+' : ''}{Math.round(delta)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
              Δ ELO (A − B)
            </label>
            <input
              type="number"
              value={manualDelta}
              onChange={e => setManualDelta(e.target.value)}
              placeholder="ex: 280"
              className="w-32 rounded-lg px-2 py-2 text-sm text-ink outline-none text-center font-mono"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
            />
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
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
              const pColor = isFav ? 'var(--color-win)' : 'var(--color-loss)'
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 space-y-2"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
                >
                  <div className="text-xs font-medium text-ink truncate">{side.label}</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold font-mono" style={{ color: pColor }}>
                        {(side.p * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Proba victoire</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-ink">
                        {side.odds.toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Cote décimale</div>
                    </div>
                  </div>
                  {takeHref(side.label, undefined, side.odds) && (
                    <Link to={takeHref(side.label, undefined, side.odds)!} className="text-xs text-muted underline underline-offset-2 hover:text-ink">Prendre ce pari</Link>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* BO3 / BO5 + handicaps, dérivés de la proba BO1 */}
        {result && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Séries & handicaps</h3>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-muted)' }}>
                s =
                <input
                  type="number"
                  value={sInput}
                  onChange={e => setSInput(e.target.value)}
                  className="w-20 rounded-lg px-2 py-1.5 text-sm text-ink outline-none text-center font-mono"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
                />
              </label>
            </div>
            {series ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {SERIES_BLOCKS.map(block => (
                  <div
                    key={block.title}
                    className="rounded-lg p-3"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
                  >
                    <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-2 items-center">
                      <div className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>{block.title}</div>
                      <div className="text-sm font-semibold text-ink text-center truncate">{result.label1}</div>
                      <div className="text-sm font-semibold text-ink text-center truncate">{result.label2}</div>
                      {block.rows.map((row, i) => (
                        <Fragment key={i}>
                          <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{row.label}</div>
                          <OddsCell p={series.a[row.a.key]} hdp={row.a.hdp} href={takeHref(result.label1, row.a.hdp, 1 / series.a[row.a.key])} />
                          <OddsCell p={series.b[row.b.key]} hdp={row.b.hdp} href={takeHref(result.label2, row.b.hdp, 1 / series.b[row.b.key])} />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--color-muted)' }}>s doit être &gt; 0.</div>
            )}
          </div>
        )}

        {!result && (
          <div className="text-center py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
            {mode === 'teams'
              ? 'Sélectionnez deux équipes pour calculer les cotes.'
              : 'Saisissez un delta ELO pour calculer les cotes.'}
          </div>
        )}
      </div>
    </div>
  )
}
