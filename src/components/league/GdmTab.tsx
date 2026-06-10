import { useState, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import type { League } from '@/types'
import { useTeams, useAllBaselines } from '@/hooks/useTeams'
import { useMatches } from '@/hooks/useMatches'
import { useGdmStats, deleteGdmStatsByStage } from '@/hooks/useGdmStats'
import { computeGdmRatings } from '@/lib/gdmRating'
import { GdmCalendarImport } from './GdmCalendarImport'
import { GdmStatsImport } from './GdmStatsImport'
import { GdmRankingTable } from './GdmRankingTable'

interface Props {
  league: League
}

export function GdmTab({ league }: Props) {
  const [sinceDate, setSinceDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [showCalendar, setShowCalendar] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<string | null>(null)

  const { teams, loading: teamsLoading } = useTeams(league.id)
  const baselines = useAllBaselines(league.id)
  const { matches, loading: matchesLoading } = useMatches(league.id)
  const { stats: gdmStats, refetch: refetchStats } = useGdmStats(league.id)

  const ratings = useMemo(() => {
    if (!teams.length) return []
    return computeGdmRatings(teams, baselines, matches, gdmStats, sinceDate)
  }, [teams, baselines, matches, gdmStats, sinceDate])

  // Stages importés dans gdm_stats
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

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>Depuis</label>
          <input
            type="date"
            value={sinceDate}
            onChange={e => setSinceDate(e.target.value)}
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

      {/* Stages importés */}
      {importedStages.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
            <h3 className="text-xs font-semibold" style={{ color: 'hsl(215 20% 65%)' }}>Stats importées</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'hsl(216 34% 22%)' }}>
            {importedStages.map(([stage, info]) => (
              <div key={stage} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-white">{stage}</span>
                  <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                    {info.teams} équipe{info.teams > 1 ? 's' : ''} · {info.totalGames} games
                  </span>
                </div>
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
                      Confirmer
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
                    Suppr.
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCalendar && (
        <GdmCalendarImport
          league={league}
          teams={teams}
          onClose={() => setShowCalendar(false)}
        />
      )}
      {showStats && (
        <GdmStatsImport
          league={league}
          teams={teams}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  )
}
