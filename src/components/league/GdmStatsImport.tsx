import { useState } from 'react'
import type { League, Team } from '@/types'
import { teamKey } from '@/lib/teamName'
import { upsertGdmStat } from '@/hooks/useGdmStats'

interface ParsedRow {
  teamId: string
  teamName: string
  gdm: number
  gd15: number | null
  games: number
}

interface UnmatchedRow {
  name: string
}

function parseStats(text: string, teamMap: Map<string, string>): {
  rows: ParsedRow[]
  unmatched: UnmatchedRow[]
} {
  const rows: ParsedRow[] = []
  const unmatched: UnmatchedRow[] = []

  for (const line of text.split('\n')) {
    const cols = line.split('\t').map(c => c.trim())
    if (cols.length < 24) continue

    const name = cols[0]
    const games = parseInt(cols[3])
    const gdm = parseFloat(cols[7])
    const gd15Raw = cols[23]

    // Skip header rows or invalid lines
    if (!name || isNaN(games) || isNaN(gdm)) continue

    const gd15 = gd15Raw === '-' || gd15Raw === '' ? null : parseFloat(gd15Raw)
    const teamId = teamMap.get(teamKey(name))

    if (!teamId) {
      unmatched.push({ name })
      continue
    }

    rows.push({ teamId, teamName: name, gdm, gd15, games })
  }

  return { rows, unmatched }
}

interface Props {
  league: League
  teams: Team[]
  onClose: () => void
  onDone?: () => void
}

export function GdmStatsImport({ league, teams, onClose, onDone }: Props) {
  const [text, setText] = useState('')
  const [stage, setStage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    unmatched: UnmatchedRow[]
  } | null>(null)

  const teamMap = new Map(teams.map(t => [teamKey(t.name), t.id]))

  const handleImport = async () => {
    if (!stage.trim()) return
    setLoading(true)

    const { rows, unmatched } = parseStats(text, teamMap)
    let imported = 0

    for (const row of rows) {
      const err = await upsertGdmStat(
        league.id,
        row.teamId,
        stage.trim().toUpperCase(),
        row.gdm,
        row.gd15,
        row.games
      )
      if (!err) imported++
    }

    setResult({ imported, unmatched })
    setLoading(false)
    if (imported > 0) onDone?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(5 8 15 / 0.75)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-line)' }}>
          <h3 className="font-semibold text-ink text-sm">Importer stats GDM — {league.name}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
              Stage / Période (ex: WEEK7, ROUND1)
            </label>
            <input
              type="text"
              value={stage}
              onChange={e => setStage(e.target.value)}
              placeholder="WEEK7"
              className="w-48 rounded-lg px-3 py-2 text-sm text-ink outline-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
              Coller le tableau de stats (colonnes : Name · … · Games · … · GDM · … · GD@15)
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={12}
              placeholder="Name	Season	Region	Games	Win rate	K:D	GPM	GDM	..."
              className="w-full rounded-lg px-3 py-2 text-xs text-ink font-mono outline-none resize-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              Colonnes utilisées : Name (1) · Games (4) · GDM (8) · GD@15 (24)
            </p>
          </div>

          {result && (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: result.imported > 0 ? 'var(--color-win)' : 'var(--color-muted)' }}>
                {result.imported} équipe{result.imported > 1 ? 's' : ''} importée{result.imported > 1 ? 's' : ''} pour {stage.toUpperCase()}.
              </p>
              {result.unmatched.length > 0 && (
                <div>
                  <p className="text-xs text-warn">Équipes non trouvées dans la ligue :</p>
                  {result.unmatched.map((u, i) => (
                    <p key={i} className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{u.name}</p>
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
              disabled={loading || !text.trim() || !stage.trim()}
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
