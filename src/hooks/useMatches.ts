import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Match, MatchNote } from '@/types'

export function useMatches(leagueId: string) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(async () => {})

  useEffect(() => {
    if (!leagueId) return
    const doFetch = async () => {
      const { data } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, league_id, created_at),
          team2:teams!matches_team2_id_fkey(id, name, league_id, created_at),
          winner:teams!matches_winner_id_fkey(id, name, league_id, created_at)
        `)
        .eq('league_id', leagueId)
        .order('match_date', { ascending: false })
      setMatches((data ?? []) as Match[])
      setLoading(false)
    }
    fetchRef.current = doFetch
    doFetch()

    const channel = supabase
      .channel(`matches-${leagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, doFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_notes' }, doFetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId])

  return { matches, loading, refetch: () => fetchRef.current() }
}

export function useMatchNotes(leagueId: string) {
  const [notes, setNotes] = useState<MatchNote[]>([])
  const fetchRef = useRef(async () => {})

  useEffect(() => {
    if (!leagueId) return
    const doFetch = async () => {
      const { data: matchIds } = await supabase
        .from('matches')
        .select('id')
        .eq('league_id', leagueId)
      if (!matchIds?.length) { setNotes([]); return }
      const ids = matchIds.map((m: { id: string }) => m.id)
      const { data } = await supabase
        .from('match_notes')
        .select('*')
        .in('match_id', ids)
        .order('note_date', { ascending: false })
      setNotes(data ?? [])
    }
    fetchRef.current = doFetch
    doFetch()

    const channel = supabase
      .channel(`notes-${leagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_notes' }, doFetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId])

  return { notes, refetch: () => fetchRef.current() }
}

export async function addMatch(
  match: Omit<Match, 'id' | 'created_at' | 'team1' | 'team2' | 'winner'>,
  note?: { note_team1: number; note_date: string }
) {
  const { data, error } = await supabase
    .from('matches')
    .insert(match)
    .select()
    .single()
  if (error || !data) return error

  if (note) {
    await supabase.from('match_notes').insert({
      match_id: data.id,
      note_date: note.note_date,
      note_team1: note.note_team1,
      team1_id: match.team1_id,
      team2_id: match.team2_id,
    })
  }
  return null
}

export async function updateMatch(
  id: string,
  match: Partial<Omit<Match, 'id' | 'created_at' | 'team1' | 'team2' | 'winner'>>,
  note?: { id?: string; note_team1: number; note_date: string; team1_id: string; team2_id: string }
) {
  const { error } = await supabase.from('matches').update(match).eq('id', id)
  if (error) return error

  if (note) {
    if (note.id) {
      await supabase.from('match_notes').update({
        note_team1: note.note_team1,
        note_date: note.note_date,
      }).eq('id', note.id)
    } else {
      await supabase.from('match_notes').insert({
        match_id: id,
        note_date: note.note_date,
        note_team1: note.note_team1,
        team1_id: note.team1_id,
        team2_id: note.team2_id,
      })
    }
  }
  return null
}

export async function upsertNote(
  matchId: string,
  noteId: string | undefined,
  noteTeam1: number,
  noteDate: string,
  team1Id: string,
  team2Id: string
) {
  if (noteId) {
    const { error } = await supabase
      .from('match_notes')
      .update({ note_team1: noteTeam1, note_date: noteDate })
      .eq('id', noteId)
    return error
  }
  const { error } = await supabase.from('match_notes').insert({
    match_id: matchId,
    note_date: noteDate,
    note_team1: noteTeam1,
    team1_id: team1Id,
    team2_id: team2Id,
  })
  return error
}

export async function deleteMatch(id: string) {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  return error
}
