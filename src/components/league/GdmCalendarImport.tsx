import { useState } from 'react'
import type { League, Team } from '@/types'
import { supabase } from '@/lib/supabase'
import { addMatch } from '@/hooks/useMatches'

interface ParsedMatch {
  league_id: string
  team1_id: string
  team2_id: string
  winner_id: string | null
  score: string
  stage: string
  match_date: string
}

interface ParseError {
  line: string
  reason: string
}

function parseLine(
  raw: string,
  leagueId: string,
  teamMap: Map<string, string>
): ParsedMatch | ParseError | null {
  const cols = raw.split('\t').map(c => c.trim())
  if (cols.length < 7) return null

  const team1Name = cols[1]
  const scoreStr = cols[2]
  const team2Name = cols[3]
  const stage = cols[4]
  const date = cols[6]

  if (!team1Name || !scoreStr || !team2Name || !stage || !date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const scoreMatch = scoreStr.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (!scoreMatch) return null

  const s1 = parseInt(scoreMatch[1])
  const s2 = parseInt(scoreMatch[2])

  const team1Id = teamMap.get(team1Name.toLowerCase())
  const team2Id = teamMap.get(team2Name.toLowerCase())

  if (!team1Id || !team2Id) {
    return {
      line: raw.slice(0, 60),
      reason: `Équipe(s) inconnue(s) : "${!team1Id ? team1Name : ''}${!team1Id && !team2Id ? '" / "' : ''}${!team2Id ? team2Name : ''}"`,
    }
  }

  return {
    league_id: leagueId,
    team1_id: team1Id,
    team2_id: team2Id,
    winner_id: s1 > s2 ? team1Id : s2 > s1 ? team2Id : null,
    score: `${s1}-${s2}`,
    stage: stage.toUpperCase(),
    match_date: date,
  }
}

interface Props {
  league: League
  teams: Team[]
  onClose: () => void
  onDone?: () => void
}

export function GdmCalendarImport({ league, teams, onClose, onDone }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; errors: ParseError[] } | null>(null)

  const teamMap = new Map(teams.map(t => [t.name.toLowerCase(), t.id]))

  const handleImport = async () => {
    setLoading(true)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // Charger les matchs existants pour dédupliquer (sans tenir compte du stage pour éviter les doublons stage vide vs stage renseigné)
    const { data: existing } = await supabase
      .from('matches')
      .select('id,team1_id,team2_id,match_date,stage')
      .eq('league_id', league.id)
    // Clé sans stage : on considère qu'il ne peut y avoir qu'un match entre deux équipes à la même date
    const existingKeys = new Set(
      (existing ?? []).map(m => `${m.team1_id}|${m.team2_id}|${m.match_date}`)
    )
    // Index des IDs des matchs sans stage pour mise à jour éventuelle
    const noStageById = new Map(
      (existing ?? []).filter(m => !m.stage).map(m => [`${m.team1_id}|${m.team2_id}|${m.match_date}`, m.id])
    )

    let imported = 0
    let updated = 0
    let skipped = 0
    const errors: ParseError[] = []

    for (const line of lines) {
      const parsed = parseLine(line, league.id, teamMap)
      if (parsed === null) continue
      if ('reason' in parsed) { errors.push(parsed); continue }

      const key = `${parsed.team1_id}|${parsed.team2_id}|${parsed.match_date}`

      // Si le match existe sans stage, on le met à jour avec le stage et le score corrects
      if (noStageById.has(key)) {
        const { error } = await supabase.from('matches')
          .update({ stage: parsed.stage, score: parsed.score, winner_id: parsed.winner_id })
          .eq('id', noStageById.get(key)!)
        if (!error) { updated++; existingKeys.add(key) }
        continue
      }

      if (existingKeys.has(key)) { skipped++; continue }

      const err = await addMatch(parsed)
      if (err) {
        errors.push({ line: line.slice(0, 60), reason: err.message })
      } else {
        imported++
        existingKeys.add(key)
      }
    }

    setResult({ imported, updated, skipped, errors })
    setLoading(false)
    if (imported > 0) onDone?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h3 className="font-semibold text-white text-sm">Importer calendrier GDM — {league.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
            Format attendu (tabulations) : <span className="font-mono text-white">label ⇥ Équipe1 ⇥ X - Y ⇥ Équipe2 ⇥ STAGE ⇥ patch ⇥ YYYY-MM-DD</span>
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            placeholder={"BLG vs AL\tBilibili Gaming\t2 - 0\tAnyone s Legend\tWEEK7\t16.9\t2026-05-17"}
            className="w-full rounded-lg px-3 py-2 text-xs text-white font-mono outline-none resize-none"
            style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)' }}
          />

          {result && (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: (result.imported > 0 || result.updated > 0) ? '#4ade80' : 'hsl(215 20% 65%)' }}>
                {result.imported > 0 && <span>{result.imported} match{result.imported > 1 ? 's' : ''} importé{result.imported > 1 ? 's' : ''}. </span>}
                {result.updated > 0 && <span style={{ color: 'hsl(217 91% 70%)' }}>{result.updated} mis à jour (stage ajouté). </span>}
                {result.skipped > 0 && <span style={{ color: 'hsl(215 20% 50%)' }}>{result.skipped} ignoré{result.skipped > 1 ? 's' : ''} (déjà présent{result.skipped > 1 ? 's' : ''}).</span>}
                {result.imported === 0 && result.updated === 0 && result.skipped === 0 && result.errors.length === 0 && <span>Aucun match à importer.</span>}
              </p>
              {result.errors.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400 font-mono">{e.reason} — {e.line}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t shrink-0" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
            {result ? 'Fermer' : 'Annuler'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={loading || !text.trim()}
              className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
            >
              {loading ? 'Import…' : 'Importer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
