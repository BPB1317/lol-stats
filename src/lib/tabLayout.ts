// Onglets personnalisés par utilisateur : ordre et onglets masqués (user_prefs.tab_layout, copie locale pour éviter le clignotement).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface TabLayout { order: string[]; hidden: string[] }
const EMPTY: TabLayout = { order: [], hidden: [] }
const KEY = 'sk-tabs'

function valid(v: unknown): TabLayout | null {
  const o = v as TabLayout | null
  return o && Array.isArray(o.order) && Array.isArray(o.hidden) ? { order: o.order.filter(x => typeof x === 'string'), hidden: o.hidden.filter(x => typeof x === 'string') } : null
}
function readLocal(): TabLayout {
  try { return valid(JSON.parse(localStorage.getItem(KEY) ?? 'null')) ?? EMPTY } catch { return EMPTY }
}
function writeLocal(l: TabLayout) {
  try { localStorage.setItem(KEY, JSON.stringify(l)) } catch { /* stockage indisponible */ }
}

export function useTabLayout(userId: string) {
  const [layout, setLayout] = useState<TabLayout>(readLocal)
  useEffect(() => {
    let alive = true
    supabase.from('user_prefs').select('tab_layout').eq('user_id', userId).maybeSingle().then(({ data }) => {
      const l = valid(data?.tab_layout)
      if (alive && l) { setLayout(l); writeLocal(l) }
    })
    return () => { alive = false }
  }, [userId])

  const save = (next: TabLayout) => {
    setLayout(next); writeLocal(next)
    supabase.from('user_prefs').upsert({ user_id: userId, tab_layout: next }).then(() => {})
  }

  /** Éléments triés selon l'ordre choisi (les onglets jamais déplacés gardent leur place par défaut, à la suite). */
  const sort = <T,>(items: T[], key: (t: T) => string): T[] => {
    const rank = (t: T, i: number) => { const r = layout.order.indexOf(key(t)); return r === -1 ? 10000 + i : r }
    return items.map((t, i) => ({ t, r: rank(t, i) })).sort((a, b) => a.r - b.r).map(x => x.t)
  }
  const isHidden = (k: string) => layout.hidden.includes(k)
  const toggle = (k: string) => save({ ...layout, hidden: isHidden(k) ? layout.hidden.filter(x => x !== k) : [...layout.hidden, k] })
  /** Déplace `k` d'un cran dans son groupe (`group` = clés du groupe dans l'ordre affiché). */
  const move = (group: string[], k: string, dir: -1 | 1) => {
    const i = group.indexOf(k), j = i + dir
    if (i < 0 || j < 0 || j >= group.length) return
    const g = [...group];[g[i], g[j]] = [g[j], g[i]]
    save({ ...layout, order: [...layout.order.filter(x => !group.includes(x)), ...g] })
  }
  const reset = () => save(EMPTY)
  return { sort, isHidden, toggle, move, reset, customized: layout.order.length > 0 || layout.hidden.length > 0 }
}
