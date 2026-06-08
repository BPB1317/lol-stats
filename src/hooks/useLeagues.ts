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
  const { error } = await supabase.from('leagues').delete().eq('id', id)
  return error
}
