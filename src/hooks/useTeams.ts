import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, TeamBaseline } from '@/types'

export function useTeams(leagueId: string) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId) return
    const fetch = async () => {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .order('name')
      setTeams(data ?? [])
      setLoading(false)
    }
    fetch()

    const channel = supabase
      .channel(`teams-${leagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId])

  return { teams, loading }
}

export function useTeamBaselines(teamId: string) {
  const [baselines, setBaselines] = useState<TeamBaseline[]>([])

  useEffect(() => {
    if (!teamId) return
    const fetch = () => {
      supabase
        .from('team_baselines')
        .select('*')
        .eq('team_id', teamId)
        .order('effective_date', { ascending: false })
        .then(({ data }) => setBaselines(data ?? []))
    }
    fetch()

    const channel = supabase
      .channel(`team-baselines-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_baselines' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [teamId])

  return baselines
}

export function useAllBaselines(leagueId: string) {
  const [baselines, setBaselines] = useState<TeamBaseline[]>([])

  useEffect(() => {
    if (!leagueId) return
    const fetch = async () => {
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)
      if (!teams?.length) return
      const ids = teams.map(t => t.id)
      const { data } = await supabase
        .from('team_baselines')
        .select('*')
        .in('team_id', ids)
        .order('effective_date', { ascending: false })
      setBaselines(data ?? [])
    }
    fetch()

    const channel = supabase
      .channel(`baselines-${leagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_baselines' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId])

  return baselines
}

export async function addTeam(team: Omit<Team, 'id' | 'created_at'>) {
  const { error } = await supabase.from('teams').insert(team)
  return error
}

export async function deleteTeam(id: string) {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  return error
}

export async function addBaseline(baseline: Omit<TeamBaseline, 'id' | 'created_at'>) {
  const { error } = await supabase.from('team_baselines').insert(baseline)
  return error
}

export async function deleteBaseline(id: string) {
  const { error } = await supabase.from('team_baselines').delete().eq('id', id)
  return error
}

export async function updateBaselineBoType(id: string, bo_type: string) {
  const { error } = await supabase.from('team_baselines').update({ bo_type }).eq('id', id)
  return error
}

export async function updateBaselineDate(id: string, effective_date: string) {
  const { error } = await supabase.from('team_baselines').update({ effective_date }).eq('id', id)
  return error
}
