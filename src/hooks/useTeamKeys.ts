// Noms de toutes les équipes (toutes ligues) pour reconnaître l'e-sport à la saisie d'un pari
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { teamKey } from '@/lib/teamName'

export function useTeamKeys() {
  const [keys, setKeys] = useState<Set<string>>(new Set())
  useEffect(() => {
    let alive = true
    ;(async () => {
      const out = new Set<string>()
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from('teams').select('name').order('id').range(from, from + 999)
        for (const t of data ?? []) out.add(teamKey(t.name))
        if (!data || data.length < 1000) break
      }
      if (alive) setKeys(out)
    })()
    return () => { alive = false }
  }, [])
  return keys
}
