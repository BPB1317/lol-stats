import { useState, useMemo, useEffect, useRef } from 'react'
import type { League, Match } from '@/types'
import { useTeams, useAllBaselines } from '@/hooks/useTeams'
import { useCalendarMatches } from '@/hooks/useMatches'
import { useGdmStats, deleteGdmStatsByStage } from '@/hooks/useGdmStats'
import { deleteCalendarMatchesByStage, deleteAllCalendarMatches } from '@/hooks/useMatches'
import { computeGdmRatings } from '@/lib/gdmRating'
import { GdmCalendarImport } from './GdmCalendarImport'
import { GdmStatsImport } from './GdmStatsImport'
import { GdmRankingTable } from './GdmRankingTable'
import { EloCalculator } from './EloCalculator'

function getStageInfo(matches: Match[]) {
  const stageMinDate: Record<string, string> = {}
  const stageMaxDate: Record<string, string> = {}
  for (const m of matches) {
    if (!m.stage) continue
    const s = m.stage.toUpperCase()
    if (!stageMinDate[s] || m.match_date < stageMinDate[s]) stageMinDate[s] = m.match_date
    if (!stageMaxDate[s] || m.match_date > stageMaxDate[s]) stageMaxDate[s] = m.match_date
  }
  return { stageMinDate, stageMaxDate }
}

interface Props {
  league: League
}

export function GdmTab({ league }: Props) {
  const [sinceDate, setSinceDate] = useState(`${new Date().getFullYear()}-01-01`)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<string | null>(null)
  const [confirmDeleteCalStage, setConfirmDeleteCalStage] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  function toggleExpanded(stage: string) {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }
  const defaultDateSet = useRef(false)

  const { teams, loading: teamsLoading } = useTeams(league.id)
  const { baselines } = useAllBaselines(league.id)

  // Initialise sinceDate à la baseline la plus récente dès que les baselines chargent
  useEffect(() => {
    if (defaultDateSet.current || baselines.length === 0) return
    const mostRecent = [...baselines].sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0].effective_date
    setSinceDate(mostRecent)
    defaultDateSet.current = true
  }, [baselines])
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useCalendarMatches(league.id)
  const { stats: gdmStats, refetch: refetchStats } = useGdmStats(league.id)

  const ratings = useMemo(() => {
    if (!teams.length) return []
    return computeGdmRatings(teams, baselines, matches, gdmStats, sinceDate)
  }, [teams, baselines, matches, gdmStats, sinceDate])

  // Stages du calendrier
  const { stageMinDate, stageMaxDate } = useMemo(() => getStageInfo(matches), [matches])
  const calendarStages = Object.keys(stageMinDate).sort()
  const qualifyingCalendarStages = new Set(
    calendarStages.filter(s => stageMinDate[s] >= sinceDate)
  )

  // Stages avec stats GDM
  const importedStages = useMemo(() => {
    const stageMap = new Map<string, { teams: number; totalGames: number }>()
    for (const s of gdmStats) {
      const entry = stageMap.get(s.stage) ?? { teams: 0, totalGames: 0 }
      entry.teams++
      entry.totalGames += s.games
      stageMap.set(s.stage, entry)
    }
    return [...stageMap.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [gdmStats])

  if (teamsLoading || matchesLoading) {
    return <div className="py-16 text-center" style={{ color: 'hsl(215 20% 65%)' }}>Chargement…</div>
  }

  const hasAnyData = calendarStages.length > 0 || importedStages.length > 0

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>Depuis</label>
          <input
            type="date"
            value={sinceDate}
            onChange={e => { if (e.target.value) setSinceDate(e.target.value) }}
            className="rounded-lg px-2 py-1.5 text-xs text-white outline-none"
            style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)', colorScheme: 'dark' }}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowCalendar(true)}
          className="px-3 py-1.5 text-xs rounded-lg font-medium"
          style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 85%)' }}
        >
          Importer calendrier
        </button>
        <button
          onClick={() => setShowStats(true)}
          className="px-3 py-1.5 text-xs rounded-lg font-medium"
          style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
        >
          Importer stats GDM
        </button>
      </div>

      {/* Classement */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h2 className="text-sm font-semibold text-white">{league.name} GDM</h2>
        </div>
        <GdmRankingTable ratings={ratings} />
      </div>

      {/* Diagnostic + stages importés */}
      {hasAnyData && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'hsl(216 34% 22%)' }}>
            <h3 className="text-xs font-semibold" style={{ color: 'hsl(215 20% 65%)' }}>
              Stages — {qualifyingCalendarStages.size} actif{qualifyingCalendarStages.size > 1 ? 's' : ''} sur {calendarStages.length} calendrier
            </h3>
            {calendarStages.length > 0 && (
              confirmDeleteAll ? (
                <div className="flex gap-1">
                  <button
                    onClick={async () => {
                      await deleteAllCalendarMatches(league.id)
                      refetchMatches()
                      setConfirmDeleteAll(false)
                    }}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: 'hsl(0 72% 51%)', color: 'white' }}
                  >
                    Confirmer tout suppr.
                  </button>
                  <button
                    onClick={() => setConfirmDeleteAll(false)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="text-xs px-2 py-1 rounded hover:opacity-80"
                  style={{ background: 'hsl(216 34% 22%)', color: '#f87171' }}
                >
                  Tout supprimer
                </button>
              )
            )}
          </div>
          <div className="divide-y" style={{ borderColor: 'hsl(216 34% 22%)' }}>
            {/* Stages du calendrier sans stats */}
            {calendarStages.filter(s => !importedStages.find(([is]) => is === s)).map(s => {
              const qualifying = qualifyingCalendarStages.has(s)
              const stageMatches = matches.filter(m => m.stage?.toUpperCase() === s)
              const expanded = expandedStages.has(s)
              return (
                <div key={s}>
                  <div className="flex items-center gap-2 px-4 py-2">
                    <button
                      onClick={() => toggleExpanded(s)}
                      className="text-xs font-mono w-4 shrink-0"
                      style={{ color: 'hsl(215 20% 50%)' }}
                    >
                      {expanded ? '▼' : '▶'}
                    </button>
                    <span className="text-xs font-semibold w-20 shrink-0" style={{ color: qualifying ? 'hsl(215 20% 65%)' : 'hsl(215 20% 35%)' }}>{s}</span>
                    <span className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>
                      {stageMinDate[s]} → {stageMaxDate[s]} · {stageMatches.length} match{stageMatches.length > 1 ? 's' : ''}
                    </span>
                    {qualifying
                      ? <span className="text-xs" style={{ color: '#facc15' }}>calendrier ✓ · stats manquantes</span>
                      : <span className="text-xs" style={{ color: 'hsl(215 20% 35%)' }}>exclu (avant sinceDate)</span>
                    }
                    <div className="flex-1" />
                    {confirmDeleteCalStage === s ? (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={async () => {
                            await deleteCalendarMatchesByStage(league.id, s)
                            refetchMatches()
                            setConfirmDeleteCalStage(null)
                          }}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: 'hsl(0 72% 51%)', color: 'white' }}
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCalStage(null)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteCalStage(s)}
                        className="text-xs px-2 py-1 rounded hover:opacity-80 shrink-0"
                        style={{ background: 'hsl(216 34% 22%)', color: '#f87171' }}
                      >
                        Suppr.
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="px-10 pb-2 space-y-0.5">
                      {stageMatches.map(m => (
                        <div key={m.id} className="flex gap-3 text-xs py-0.5" style={{ color: 'hsl(215 20% 65%)' }}>
                          <span style={{ color: 'hsl(215 20% 45%)' }}>{m.match_date}</span>
                          <span className={m.winner_id === m.team1_id ? 'font-semibold text-white' : ''}>{m.team1?.name}</span>
                          <span style={{ color: 'hsl(215 20% 40%)' }}>vs</span>
                          <span className={m.winner_id === m.team2_id ? 'font-semibold text-white' : ''}>{m.team2?.name}</span>
                          {m.score && <span className="font-mono">{m.score}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {/* Stages avec stats */}
            {importedStages.map(([stage, info]) => {
              const hasCalendar = !!stageMinDate[stage]
              const qualifying = qualifyingCalendarStages.has(stage)
              const active = hasCalendar && qualifying
              const stageMatches = matches.filter(m => m.stage?.toUpperCase() === stage)
              const expanded = expandedStages.has(stage)
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2">
                      {hasCalendar && (
                        <button
                          onClick={() => toggleExpanded(stage)}
                          className="text-xs font-mono w-4 shrink-0"
                          style={{ color: 'hsl(215 20% 50%)' }}
                        >
                          {expanded ? '▼' : '▶'}
                        </button>
                      )}
                      <span className="text-xs font-semibold" style={{ color: active ? 'white' : 'hsl(215 20% 35%)' }}>{stage}</span>
                      <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                        {info.teams} éq. · {info.totalGames} games GDM
                        {hasCalendar && ` · ${stageMatches.length} cal.`}
                      </span>
                      {active
                        ? <span className="text-xs" style={{ color: '#4ade80' }}>actif ✓</span>
                        : !hasCalendar
                          ? <span className="text-xs" style={{ color: '#f87171' }}>calendrier manquant</span>
                          : <span className="text-xs" style={{ color: 'hsl(215 20% 35%)' }}>exclu (avant sinceDate)</span>
                      }
                    </div>
                    <div className="flex gap-1">
                      {hasCalendar && (
                        confirmDeleteCalStage === `cal-${stage}` ? (
                          <>
                            <button
                              onClick={async () => {
                                await deleteCalendarMatchesByStage(league.id, stage)
                                refetchMatches()
                                setConfirmDeleteCalStage(null)
                              }}
                              className="text-xs px-2 py-1 rounded"
                              style={{ background: 'hsl(0 72% 51%)', color: 'white' }}
                            >
                              Confirmer cal.
                            </button>
                            <button
                              onClick={() => setConfirmDeleteCalStage(null)}
                              className="text-xs px-2 py-1 rounded"
                              style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteCalStage(`cal-${stage}`)}
                            className="text-xs px-2 py-1 rounded hover:opacity-80"
                            style={{ background: 'hsl(216 34% 22%)', color: '#f87171' }}
                          >
                            Suppr. cal.
                          </button>
                        )
                      )}
                      {confirmDeleteStage === stage ? (
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              await deleteGdmStatsByStage(league.id, stage)
                              refetchStats()
                              setConfirmDeleteStage(null)
                            }}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'hsl(0 72% 51%)', color: 'white' }}
                          >
                            Confirmer GDM
                          </button>
                          <button
                            onClick={() => setConfirmDeleteStage(null)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteStage(stage)}
                          className="text-xs px-2 py-1 rounded hover:opacity-80"
                          style={{ background: 'hsl(216 34% 22%)', color: '#f87171' }}
                        >
                          Suppr. GDM
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded && hasCalendar && (
                    <div className="px-10 pb-2 space-y-0.5">
                      {stageMatches.map(m => (
                        <div key={m.id} className="flex gap-3 text-xs py-0.5" style={{ color: 'hsl(215 20% 65%)' }}>
                          <span style={{ color: 'hsl(215 20% 45%)' }}>{m.match_date}</span>
                          <span className={m.winner_id === m.team1_id ? 'font-semibold text-white' : ''}>{m.team1?.name}</span>
                          <span style={{ color: 'hsl(215 20% 40%)' }}>vs</span>
                          <span className={m.winner_id === m.team2_id ? 'font-semibold text-white' : ''}>{m.team2?.name}</span>
                          {m.score && <span className="font-mono">{m.score}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calculateur de cotes GDM */}
      <EloCalculator
        ratings={ratings.map(r => ({ team: r.team, output: r.output ?? r.input }))}
      />

      {showCalendar && (
        <GdmCalendarImport
          league={league}
          teams={teams}
          onClose={() => setShowCalendar(false)}
          onDone={refetchMatches}
        />
      )}
      {showStats && (
        <GdmStatsImport
          league={league}
          teams={teams}
          onClose={() => setShowStats(false)}
          onDone={refetchStats}
        />
      )}
    </div>
  )
}
