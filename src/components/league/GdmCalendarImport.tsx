import { useState } from 'react'
import type { League, Team } from '@/types'
import { teamKey } from '@/lib/teamName'
import { supabase } from '@/lib/supabase'
import { addMatch } from '@/hooks/useMatches'

interface ParsedMatch {
  league_id: string
  team1_id: string
  team2_id: string
  winner_id: string | null
  score: string | null
  stage: string
  match_date: string
  source: 'calendar'
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
  if (cols.length < 5) return null

  const team1Name = cols[1]
  const scoreStr = cols[2]
  const team2Name = cols[3]
  const stage = cols[4]

  // Date : prend la DERNIÈRE colonne au format YYYY-MM-DD
  // (certains calendriers ont une date d'ajout avant la date du match)
  const date = [...cols].reverse().find(c => /^\d{4}-\d{2}-\d{2}$/.test(c)) ?? ''

  if (!team1Name || !team2Name || !stage || !date) return null

  const team1Id = teamMap.get(teamKey(team1Name))
  const team2Id = teamMap.get(teamKey(team2Name))

  if (!team1Id || !team2Id) {
    return {
      line: raw.slice(0, 60),
      reason: `Équipe(s) inconnue(s) : "${!team1Id ? team1Name : ''}${!team1Id && !team2Id ? '" / "' : ''}${!team2Id ? team2Name : ''}"`,
    }
  }

  // Score optionnel : "2-0", "2 - 0" → parsé ; "-", "", absent → null
  const scoreMatch = scoreStr ? scoreStr.match(/(\d+)\s*[-–]\s*(\d+)/) : null
  const s1 = scoreMatch ? parseInt(scoreMatch[1]) : null
  const s2 = scoreMatch ? parseInt(scoreMatch[2]) : null

  return {
    league_id: leagueId,
    team1_id: team1Id,
    team2_id: team2Id,
    winner_id: s1 != null && s2 != null ? (s1 > s2 ? team1Id : s2 > s1 ? team2Id : null) : null,
    score: s1 != null && s2 != null ? `${s1}-${s2}` : null,
    stage: stage.toUpperCase(),
    match_date: date,
    source: 'calendar' as const,
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

  const teamMap = new Map(teams.map(t => [teamKey(t.name), t.id]))

  const handleImport = async () => {
    setLoading(true)
    const map = new Map(teamMap)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // Créer les équipes manquantes
    const allNamesInText = new Set<string>()
    for (const line of lines) {
      const cols = line.split('\t').map(c => c.trim())
      if (cols.length >= 4) { allNamesInText.add(cols[1]); allNamesInText.add(cols[3]) }
    }
    const missingNames = [...allNamesInText].filter(name => name && !map.get(teamKey(name)))
    if (missingNames.length > 0) {
      const { data: created } = await supabase
        .from('teams')
        .insert(missingNames.map(name => ({ league_id: league.id, name })))
        .select()
      for (const t of created ?? []) map.set(teamKey(t.name), t.id)
    }

    // Charger uniquement les matchs calendrier existants pour dédupliquer
    const { data: existing } = await supabase
      .from('matches')
      .select('id,team1_id,team2_id,match_date,stage')
      .eq('league_id', league.id)
      .eq('source', 'calendar')
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
      const parsed = parseLine(line, league.id, map)
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
    if (imported > 0 || updated > 0) onDone?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(5 8 15 / 0.75)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-line)' }}>
          <h3 className="font-semibold text-ink text-sm">Importer calendrier GDM — {league.name}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Format attendu (tabulations) : <span className="font-mono text-ink">label ⇥ Équipe1 ⇥ X - Y ⇥ Équipe2 ⇥ STAGE ⇥ patch ⇥ YYYY-MM-DD</span> — le score est optionnel
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            placeholder={"BLG vs AL\tBilibili Gaming\t2 - 0\tAnyone s Legend\tWEEK7\t16.9\t2026-05-17"}
            className="w-full rounded-lg px-3 py-2 text-xs text-ink font-mono outline-none resize-none"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
          />

          {result && (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: (result.imported > 0 || result.updated > 0) ? 'var(--color-win)' : 'var(--color-muted)' }}>
                {result.imported > 0 && <span>{result.imported} match{result.imported > 1 ? 's' : ''} importé{result.imported > 1 ? 's' : ''}. </span>}
                {result.updated > 0 && <span style={{ color: 'var(--color-ink)' }}>{result.updated} mis à jour (stage ajouté). </span>}
                {result.skipped > 0 && <span style={{ color: 'var(--color-muted)' }}>{result.skipped} ignoré{result.skipped > 1 ? 's' : ''} (déjà présent{result.skipped > 1 ? 's' : ''}).</span>}
                {result.imported === 0 && result.updated === 0 && result.skipped === 0 && result.errors.length === 0 && <span>Aucun match à importer.</span>}
              </p>
              {result.errors.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-loss font-mono">{e.reason} — {e.line}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--color-line)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--color-line)', color: 'var(--color-muted)' }}>
            {result ? 'Fermer' : 'Annuler'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={loading || !text.trim()}
              className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bg)' }}
            >
              {loading ? 'Import…' : 'Importer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
