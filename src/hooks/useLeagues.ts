import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { League } from '@/types'

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('leagues')
        .select('*')
        .order('sort_order')
      setLeagues(data ?? [])
      setLoading(false)
    }
    fetch()

    const channel = supabase
      .channel('leagues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { leagues, loading }
}

export async function addLeague(league: Omit<League, 'id' | 'created_at'>) {
  const { error } = await supabase.from('leagues').insert(league)
  return error
}

export async function deleteLeague(id: string) {
  // Récupère les équipes pour cascade manuelle
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', id)
  const teamIds = (teams ?? []).map(t => t.id)

  if (teamIds.length > 0) {
    // match_notes référencent les matchs → supprimer d'abord
    const { data: matches } = await supabase.from('matches').select('id').eq('league_id', id)
    const matchIds = (matches ?? []).map(m => m.id)
    if (matchIds.length > 0) {
      await supabase.from('match_notes').delete().in('match_id', matchIds)
    }
    await supabase.from('matches').delete().eq('league_id', id)
    await supabase.from('team_baselines').delete().in('team_id', teamIds)
    await supabase.from('teams').delete().eq('league_id', id)
  }

  await supabase.from('gdm_stats').delete().eq('league_id', id)

  const { error } = await supabase.from('leagues').delete().eq('id', id)
  return error
}
