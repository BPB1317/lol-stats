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

/** Crée une ligue et renvoie son id (pour y reprendre ensuite des équipes). */
export async function createLeague(league: Omit<League, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('leagues').insert(league).select('id').single()
  return { id: (data?.id as string | undefined) ?? null, error }
}

/**
 * Reprend les équipes d'une ligue dans une autre (ligues franchisées : mêmes équipes d'un split à l'autre).
 * Avec `baselines`, chaque équipe reçoit aussi son dernier Elo d'entrée, daté du jour choisi.
 */
export async function copyTeams(fromLeagueId: string, toLeagueId: string, baselines?: { date: string; boType: string }) {
  const { data: teams, error } = await supabase.from('teams').select('id,name').eq('league_id', fromLeagueId)
  if (error || !teams?.length) return { count: 0, error }
  const { data: created, error: insErr } = await supabase.from('teams')
    .insert(teams.map(t => ({ league_id: toLeagueId, name: t.name }))).select('id,name')
  if (insErr || !created) return { count: 0, error: insErr }
  if (baselines) {
    const { data: rows } = await supabase.from('team_baselines').select('team_id,rating,effective_date').in('team_id', teams.map(t => t.id))
    const latest = new Map<string, number>()
    for (const r of [...(rows ?? [])].sort((a, b) => a.effective_date.localeCompare(b.effective_date))) latest.set(r.team_id, r.rating)
    const byName = new Map(teams.map(t => [t.name, t.id]))
    const inserts = created.flatMap(c => {
      const rating = latest.get(byName.get(c.name) ?? '')
      return rating == null ? [] : [{ team_id: c.id, rating, effective_date: baselines.date, bo_type: baselines.boType }]
    })
    if (inserts.length) {
      const { error: bErr } = await supabase.from('team_baselines').insert(inserts)
      if (bErr) return { count: created.length, error: bErr }
    }
  }
  return { count: created.length, error: null }
}
