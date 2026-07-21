import { useState, useMemo } from 'react'
import type { League, Team } from '@/types'
import { supabase } from '@/lib/supabase'

interface CalendarImportDialogProps {
  league: League
  teams: Team[]
  onClose: () => void
}

interface ParsedSeries {
  team1Name: string
  team2Name: string
  score1: number | null
  score2: number | null
  stage: string
  date: string
  team1Id: string | null
  team2Id: string | null
  games: number
}

function buildTeamMap(teams: Team[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) map.set(t.name.toLowerCase(), t.id)
  return map
}

function parseLine(line: string, teamMap: Map<string, string>): ParsedSeries | null {
  const cols = line.split('\t').map(c => c.trim()).filter(Boolean)
  if (cols.length < 3) return null

  // Date (YYYY-MM-DD) — obligatoire
  const dateIdx = cols.findIndex(c => /^\d{4}-\d{2}-\d{2}$/.test(c))
  if (dateIdx === -1) return null
  const date = cols[dateIdx]

  // Score (optionnel) — ex: "2-0", "2 - 1"
  const scoreIdx = cols.findIndex(c => /^\d+\s*[-–]\s*\d+$/.test(c))

  const isNoise = (c: string, i: number) =>
    i === dateIdx ||
    (scoreIdx !== -1 && i === scoreIdx) ||
    /^\d+\.\d+$/.test(c) ||   // version patch "16.10"
    /\bvs\b/i.test(c)          // "AL vs BLG"

  let team1Name: string
  let team2Name: string
  let score1: number | null = null
  let score2: number | null = null
  let stage = ''

  if (scoreIdx !== -1) {
    // Score trouvé → teams détectées relativement au score
    const parts = cols[scoreIdx].split(/\s*[-–]\s*/)
    score1 = parseInt(parts[0], 10)
    score2 = parseInt(parts[1], 10)
    if (isNaN(score1) || isNaN(score2)) return null

    const before = cols.filter((c, i) => i < scoreIdx && !isNoise(c, i))
    const after  = cols.filter((c, i) => i > scoreIdx && i < dateIdx && !isNoise(c, i))
    if (!before.length || !after.length) return null

    team1Name = before[before.length - 1]
    team2Name = after[0]
    // Stage = 2ème colonne non-bruit après le score (souvent WEEK1, GROUPSTAGE…)
    stage = after[1] ?? ''
  } else {
    // Pas de score → format positionnel : label | team1 | - | team2 | stage | … | date
    if (cols.length < 5) return null
    team1Name = cols[1]
    team2Name = cols[3]
    stage = cols[4] ?? ''
  }

  const team1Id = teamMap.get(team1Name.toLowerCase()) ?? null
  const team2Id = teamMap.get(team2Name.toLowerCase()) ?? null
  const games   = score1 !== null && score2 !== null ? score1 + score2 : 1

  return { team1Name, team2Name, score1, score2, stage, date, team1Id, team2Id, games }
}

export function CalendarImportDialog({ league, teams, onClose }: CalendarImportDialogProps) {
  const [text, setText]         = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult]     = useState<{ ok: number; skipped: number } | null>(null)

  const teamMap = useMemo(() => buildTeamMap(teams), [teams])

  const parsed = useMemo(() =>
    text.split('\n').map(l => l.trim()).filter(Boolean)
      .map(l => parseLine(l, teamMap)).filter(Boolean) as ParsedSeries[]
  , [text, teamMap])

  const valid       = parsed.filter(p => p.team1Id && p.team2Id)
  const totalGames  = valid.reduce((s, p) => s + p.games, 0)
  const unknownTeams = [...new Set(
    parsed.flatMap(p => [
      p.team1Id ? null : p.team1Name,
      p.team2Id ? null : p.team2Name,
    ].filter(Boolean) as string[])
  )]

  async function handleImport() {
    if (!parsed.length) return
    setImporting(true)

    // Créer les équipes manquantes avant d'importer
    const allNames = [...new Set(parsed.flatMap(p => [p.team1Name, p.team2Name]))]
    const missingNames = allNames.filter(name => !teamMap.get(name.toLowerCase()))
    const extendedMap = new Map(teamMap)
    if (missingNames.length > 0) {
      const { data: created } = await supabase
        .from('teams')
        .insert(missingNames.map(name => ({ league_id: league.id, name })))
        .select()
      for (const t of created ?? []) extendedMap.set(t.name.toLowerCase(), t.id)
    }

    // Re-résoudre les IDs avec la map étendue
    const resolved = parsed.map(p => ({
      ...p,
      team1Id: extendedMap.get(p.team1Name.toLowerCase()) ?? null,
      team2Id: extendedMap.get(p.team2Name.toLowerCase()) ?? null,
    })).filter(p => p.team1Id && p.team2Id)

    type MatchRow = {
      league_id: string; team1_id: string; team2_id: string
      winner_id: string | null; score: string | null
      stage: string; match_date: string; source: string
    }
    const rows: MatchRow[] = resolved.flatMap((series): MatchRow[] => {
      if (series.score1 === null || series.score2 === null) {
        return [{
          league_id:  league.id,
          team1_id:   series.team1Id!,
          team2_id:   series.team2Id!,
          winner_id:  null,
          score:      null,
          stage:      series.stage.toUpperCase(),
          match_date: series.date,
          source:     'manual',
        }]
      }
      return [
        ...Array.from({ length: series.score1 }, () => ({
          league_id:  league.id,
          team1_id:   series.team1Id!,
          team2_id:   series.team2Id!,
          winner_id:  series.team1Id!,
          score:      `${series.score1}-${series.score2}`,
          stage:      series.stage.toUpperCase(),
          match_date: series.date,
          source:     'manual',
        })),
        ...Array.from({ length: series.score2 }, () => ({
          league_id:  league.id,
          team1_id:   series.team1Id!,
          team2_id:   series.team2Id!,
          winner_id:  series.team2Id!,
          score:      `${series.score1}-${series.score2}`,
          stage:      series.stage.toUpperCase(),
          match_date: series.date,
          source:     'manual',
        })),
      ]
    })

    const { data, error } = await supabase.from('matches').insert(rows).select()
    setResult({
      ok:      data?.length ?? 0,
      skipped: error ? rows.length : rows.length - (data?.length ?? 0),
    })
    setImporting(false)
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
          <h2 className="text-base font-semibold text-white">Import terminé</h2>
          <p className="text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
            {result.ok} match{result.ok > 1 ? 's' : ''} créé{result.ok > 1 ? 's' : ''}
            {result.skipped > 0 ? `, ${result.skipped} erreur${result.skipped > 1 ? 's' : ''}` : ''}.
          </p>
          <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-medium" style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}>
            Fermer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h3 className="font-semibold text-white text-sm">Importer un calendrier — {league.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
            Collez le calendrier (copier-coller depuis le site). La date et les équipes sont obligatoires — le score est optionnel.
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-lg px-3 py-2 text-xs font-mono resize-y"
            style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)', color: 'hsl(215 20% 85%)', outline: 'none' }}
            placeholder="Coller ici…"
          />

          {unknownTeams.length > 0 && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'hsl(217 91% 60% / 0.1)', border: '1px solid hsl(217 91% 60% / 0.3)', color: 'hsl(217 91% 75%)' }}>
              Équipes inconnues — seront créées automatiquement : {unknownTeams.join(', ')}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(216 34% 22%)' }}>
              <div className="px-3 py-2 text-xs" style={{ background: 'hsl(222 47% 16%)', color: 'hsl(215 20% 65%)' }}>
                {valid.length} série{valid.length > 1 ? 's' : ''} valide{valid.length > 1 ? 's' : ''} — {totalGames} match{totalGames > 1 ? 's' : ''} à créer
                {parsed.length > valid.length && (
                  <span className="ml-2" style={{ color: 'hsl(38 92% 70%)' }}>
                    ({parsed.length - valid.length} ignorée{parsed.length - valid.length > 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {parsed.map((p, i) => {
                      const ok = p.team1Id && p.team2Id
                      return (
                        <tr key={i} className="border-b" style={{ borderColor: 'hsl(216 34% 22%)', opacity: ok ? 1 : 0.45 }}>
                          <td className="px-3 py-1.5 text-white">
                            {p.team1Name}
                            <span className="mx-1.5" style={{ color: 'hsl(215 20% 50%)' }}>vs</span>
                            {p.team2Name}
                          </td>
                          <td className="px-3 py-1.5 font-mono" style={{ color: 'hsl(215 20% 65%)' }}>
                            {p.score1 !== null && p.score2 !== null ? `${p.score1}–${p.score2}` : '—'}
                          </td>
                          <td className="px-3 py-1.5" style={{ color: 'hsl(215 20% 50%)' }}>{p.stage}</td>
                          <td className="px-3 py-1.5" style={{ color: 'hsl(215 20% 65%)' }}>{p.date}</td>
                          <td className="px-3 py-1.5 text-right" style={{ color: ok ? 'hsl(215 20% 65%)' : 'hsl(217 91% 70%)' }}>
                            {ok ? `${p.games} match${p.games > 1 ? 's' : ''}` : '✚ équipes créées'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={importing || parsed.length === 0}
              className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-40"
              style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
            >
              {importing ? 'Import en cours…' : `Importer ${totalGames || ''} match${totalGames !== 1 ? 's' : ''}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
