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

/**
 * Dernière activité de chaque ligue : la plus récente parmi sa création, l'ajout d'un match ou d'un calendrier,
 * l'import de stats GDM et la saisie d'un Elo. Sert à afficher les ligues « dernière mise à jour en premier ».
 */
export function useLeagueActivity(leagues: League[]) {
  const [activity, setActivity] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!leagues.length) return
    let alive = true
    ;(async () => {
      const [m, g, b] = await Promise.all([
        supabase.from('matches').select('league_id,created_at').order('created_at', { ascending: false }).limit(1000),
        supabase.from('gdm_stats').select('league_id,created_at').order('created_at', { ascending: false }).limit(1000),
        supabase.from('team_baselines').select('created_at,teams(league_id)').order('created_at', { ascending: false }).limit(1000),
      ])
      const out: Record<string, string> = {}
      const bump = (id: string | undefined, at: string | null | undefined) => { if (id && at && (!out[id] || at > out[id])) out[id] = at }
      for (const l of leagues) bump(l.id, l.created_at)
      for (const r of m.data ?? []) bump(r.league_id, r.created_at)
      for (const r of g.data ?? []) bump(r.league_id, r.created_at)
      for (const r of (b.data ?? []) as { created_at: string; teams: { league_id: string } | { league_id: string }[] | null }[]) {
        const t = Array.isArray(r.teams) ? r.teams[0] : r.teams
        bump(t?.league_id, r.created_at)
      }
      if (alive) setActivity(out)
    })()
    return () => { alive = false }
  }, [leagues])
  return activity
}

/** Ligues triées par dernière activité (les plus récemment mises à jour en premier). */
export function sortByActivity(leagues: League[], activity: Record<string, string>) {
  return [...leagues].sort((a, b) => (activity[b.id] ?? b.created_at).localeCompare(activity[a.id] ?? a.created_at) || b.sort_order - a.sort_order)
}
