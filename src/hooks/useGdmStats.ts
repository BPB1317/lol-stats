import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { GdmStat } from '@/types'

export function useGdmStats(leagueId: string) {
  const [stats, setStats] = useState<GdmStat[]>([])
  const fetchRef = useRef(async () => {})

  useEffect(() => {
    if (!leagueId) return
    const doFetch = async () => {
      const { data } = await supabase
        .from('gdm_stats')
        .select('*')
        .eq('league_id', leagueId)
        .order('stage')
      setStats(data ?? [])
    }
    fetchRef.current = doFetch
    doFetch()

    const channel = supabase
      .channel(`gdm-stats-${leagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gdm_stats' }, doFetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId])

  return { stats, refetch: () => fetchRef.current() }
}

export async function upsertGdmStat(
  leagueId: string,
  teamId: string,
  stage: string,
  gdm: number,
  gd15: number | null,
  games: number
) {
  const { error } = await supabase
    .from('gdm_stats')
    .upsert(
      { league_id: leagueId, team_id: teamId, stage, gdm, gd15, games },
      { onConflict: 'league_id,team_id,stage' }
    )
  return error
}

export async function deleteGdmStatsByStage(leagueId: string, stage: string) {
  const { error } = await supabase
    .from('gdm_stats')
    .delete()
    .eq('league_id', leagueId)
    .eq('stage', stage)
  return error
}
