import { useState, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import type { League } from '@/types'
import { useTeams, useAllBaselines } from '@/hooks/useTeams'
import { useMatches, useMatchNotes } from '@/hooks/useMatches'
import { computeLeagueRatings } from '@/lib/rating'
import { RatingControls } from './RatingControls'
import { RankingTable } from './RankingTable'

interface RankingTabProps {
  league: League
}

export function RankingTab({ league }: RankingTabProps) {
  const defaultSince = format(subMonths(new Date(), 3), 'yyyy-MM-dd')
  const [sinceDate, setSinceDate] = useState(defaultSince)
  const [sensitivity, setSensitivity] = useState(0.1)

  const { teams, loading: teamsLoading } = useTeams(league.id)
  const baselines = useAllBaselines(league.id)
  const { matches, loading: matchesLoading } = useMatches(league.id)
  const notes = useMatchNotes(league.id)

  const ratings = useMemo(() => {
    if (!teams.length) return []
    return computeLeagueRatings(teams, baselines, matches, notes, sinceDate, sensitivity)
  }, [teams, baselines, matches, notes, sinceDate, sensitivity])

  if (teamsLoading || matchesLoading) {
    return <div className="py-16 text-center" style={{ color: 'hsl(215 20% 65%)' }}>Chargement…</div>
  }

  return (
    <div className="space-y-4">
      <RatingControls
        sinceDate={sinceDate}
        sensitivity={sensitivity}
        onSinceDateChange={setSinceDate}
        onSensitivityChange={setSensitivity}
      />
      <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h2 className="text-sm font-semibold text-white">Classement — {league.name}</h2>
          <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
            Seuil max : {(league.threshold * 100).toFixed(0)}%
          </span>
        </div>
        <RankingTable ratings={ratings} threshold={league.threshold} />
      </div>
    </div>
  )
}
