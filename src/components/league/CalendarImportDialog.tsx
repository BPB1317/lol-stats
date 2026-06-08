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
  score1: number
  score2: number
  stage: string
  date: string
  team1Id: string | null
  team2Id: string | null
  games: number
}

function buildTeamMap(teams: Team[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) {
    map.set(t.name.toLowerCase(), t.id)
  }
  return map
}

function parseLine(line: string, teamMap: Map<string, string>): ParsedSeries | null {
  const cols = line.split('\t')
  if (cols.length < 7) return null

  const team1Name = cols[1].trim()
  const scoreStr  = cols[2].trim()
  const team2Name = cols[3].trim()
  const stage     = cols[4].trim().toUpperCase()
  const date      = cols[6].trim()

  if (!team1Name || !team2Name || !stage || !date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const scoreParts = scoreStr.split(/\s*-\s*/)
  if (scoreParts.length !== 2) return null
  const score1 = parseInt(scoreParts[0], 10)
  const score2 = parseInt(scoreParts[1], 10)
  if (isNaN(score1) || isNaN(score2) || score1 + score2 <= 0) return null

  const team1Id = teamMap.get(team1Name.toLowerCase()) ?? null
  const team2Id = teamMap.get(team2Name.toLowerCase()) ?? null

  return { team1Name, team2Name, score1, score2, stage, date, team1Id, team2Id, games: score1 + score2 }
}

export function CalendarImportDialog({ league, teams, onClose }: CalendarImportDialogProps) {
  const [text, setText]       = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult]   = useState<{ ok: number; skipped: number } | null>(null)

  const teamMap = useMemo(() => buildTeamMap(teams), [teams])

  const parsed = useMemo(() =>
    text.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => parseLine(l, teamMap))
      .filter(Boolean) as ParsedSeries[]
  , [text, teamMap])

  const valid      = parsed.filter(p => p.team1Id && p.team2Id)
  const totalGames = valid.reduce((s, p) => s + p.games, 0)

  const unknownTeams = [...new Set(
    parsed.flatMap(p => [
      p.team1Id ? null : p.team1Name,
      p.team2Id ? null : p.team2Name,
    ].filter(Boolean) as string[])
  )]

  async function handleImport() {
    if (!valid.length) return
    setImporting(true)

    // score1 games won by team1, score2 games won by team2 (team order unchanged)
    const rows = valid.flatMap(series => [
      ...Array.from({ length: series.score1 }, () => ({
        league_id:  league.id,
        team1_id:   series.team1Id!,
        team2_id:   series.team2Id!,
        winner_id:  series.team1Id!,
        score:      `${series.score1}-${series.score2}`,
        stage:      series.stage,
        match_date: series.date,
      })),
      ...Array.from({ length: series.score2 }, () => ({
        league_id:  league.id,
        team1_id:   series.team1Id!,
        team2_id:   series.team2Id!,
        winner_id:  series.team2Id!,
        score:      `${series.score1}-${series.score2}`,
        stage:      series.stage,
        match_date: series.date,
      })),
    ])

    const { data, error } = await supabase.from('matches').insert(rows).select()
    setResult({
      ok: data?.length ?? 0,
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
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
          >
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
            Collez le calendrier (colonnes séparées par des tabulations) :<br />
            <span className="font-mono opacity-60">Matchup ⇥ Team1 ⇥ Score ⇥ Team2 ⇥ Stage ⇥ Version ⇥ Date</span>
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-lg px-3 py-2 text-xs font-mono resize-y"
            style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)', color: 'hsl(215 20% 85%)', outline: 'none' }}
            placeholder={'AL vs BLG\tAnyone s Legend\t0 - 3\tBilibili Gaming\tROUND3\t16.10\t2026-06-08'}
          />

          {unknownTeams.length > 0 && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.4)', color: 'hsl(38 92% 70%)' }}>
              Équipes non reconnues (lignes ignorées) : {unknownTeams.join(', ')}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(216 34% 22%)' }}>
              <div className="px-3 py-2 text-xs" style={{ background: 'hsl(222 47% 16%)', color: 'hsl(215 20% 65%)' }}>
                {valid.length} série{valid.length > 1 ? 's' : ''} valide{valid.length > 1 ? 's' : ''} — {totalGames} game{totalGames > 1 ? 's' : ''} à créer
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
                            {p.score1}–{p.score2}
                          </td>
                          <td className="px-3 py-1.5" style={{ color: 'hsl(217 91% 60%)' }}>{p.stage}</td>
                          <td className="px-3 py-1.5" style={{ color: 'hsl(215 20% 65%)' }}>{p.date}</td>
                          <td className="px-3 py-1.5 text-right" style={{ color: ok ? 'hsl(215 20% 65%)' : 'hsl(38 92% 70%)' }}>
                            {ok ? `${p.games} game${p.games > 1 ? 's' : ''}` : '⚠ inconnues'}
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
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={importing || totalGames === 0}
              className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-40"
              style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
            >
              {importing ? 'Import en cours…' : `Importer ${totalGames || ''} match${totalGames > 1 ? 's' : ''}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
