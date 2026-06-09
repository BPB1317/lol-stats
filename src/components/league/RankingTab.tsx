import { useState, useMemo, useEffect, useRef } from 'react'
import { format, subMonths } from 'date-fns'
import type { League } from '@/types'
import { useTeams, useAllBaselines } from '@/hooks/useTeams'
import { useMatches, useMatchNotes } from '@/hooks/useMatches'
import { computeLeagueRatings } from '@/lib/rating'
import { RatingControls } from './RatingControls'
import { RankingTable } from './RankingTable'
import { EloCalculator } from './EloCalculator'

interface RankingTabProps {
  league: League
}

export function RankingTab({ league }: RankingTabProps) {
  const [sinceDate, setSinceDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [sensitivity, setSensitivity] = useState(100)

  const { teams, loading: teamsLoading } = useTeams(league.id)
  const baselines = useAllBaselines(league.id)
  const { matches, loading: matchesLoading } = useMatches(league.id)
  const { notes } = useMatchNotes(league.id)

  // Date de la dernière mise à jour des baselines pour cette ligue
  const lastBaselineDate = useMemo(() => {
    if (baselines.length === 0) return null
    return baselines.reduce((max, b) => b.effective_date > max ? b.effective_date : max, '')
  }, [baselines])

  // Auto-set le "since" à la dernière baseline :
  // - au premier chargement de chaque ligue
  // - quand une baseline plus récente que le since courant est ajoutée en temps réel
  const initializedLeague = useRef('')
  const sinceDateRef = useRef(sinceDate)
  sinceDateRef.current = sinceDate

  useEffect(() => {
    if (!lastBaselineDate) return
    const isNewLeague = initializedLeague.current !== league.id
    const isNewerBaseline = lastBaselineDate > sinceDateRef.current
    if (isNewLeague || isNewerBaseline) {
      setSinceDate(lastBaselineDate)
      initializedLeague.current = league.id
    }
  }, [lastBaselineDate, league.id])

  useEffect(() => {
    initializedLeague.current = ''
  }, [league.id])

  const ratings = useMemo(() => {
    if (!teams.length) return []
    return computeLeagueRatings(teams, baselines, matches, notes, sinceDate, sensitivity)
  }, [teams, baselines, matches, notes, sinceDate, sensitivity])

  const lastNoteDate = useMemo(() => {
    const dates = notes.map(n => n.note_date).filter(Boolean)
    return dates.length ? dates.sort().at(-1)! : null
  }, [notes])

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
          <div className="flex items-center gap-4">
            {lastNoteDate && (
              <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                Dernier match noté : <span className="text-white">{format(new Date(lastNoteDate + 'T00:00:00'), 'dd/MM/yyyy')}</span>
              </span>
            )}
            {lastBaselineDate && (
              <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                Baselines : {format(new Date(lastBaselineDate + 'T00:00:00'), 'dd/MM/yyyy')}
              </span>
            )}
            <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
              Seuil : {(league.threshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <RankingTable ratings={ratings} />
      </div>
      <EloCalculator ratings={ratings} />
    </div>
  )
}
