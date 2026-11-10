// Sauvegarde complète : toutes les tables (paris et modèles) dans un seul fichier JSON daté, téléchargé sur l'appareil
import { supabase } from './supabase'

export const BACKUP_TABLES = [
  'bets', 'money_moves', 'compta_legacy', 'app_settings', 'profiles', 'user_prefs', 'tennis_elo',
  'leagues', 'teams', 'team_baselines', 'matches', 'match_notes', 'gdm_stats',
] as const

export async function downloadFullBackup(onProgress?: (table: string) => void) {
  const out: Record<string, unknown[]> = {}
  for (const table of BACKUP_TABLES) {
    onProgress?.(table)
    const rows: unknown[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + 999)
      if (error) throw new Error(`${table} : ${error.message}`)
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    out[table] = rows
  }
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), tables: out }, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `bpb-sauvegarde-${stamp}.json`; a.click()
  URL.revokeObjectURL(url)
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]))
}
