import { useState, useRef } from 'react'
import { format } from 'date-fns'
import type { League, Match, MatchNote } from '@/types'
import { useTeams } from '@/hooks/useTeams'
import { useMatches, useMatchNotes, deleteMatch, upsertNote } from '@/hooks/useMatches'
import { MatchDialog } from './MatchDialog'
import { CalendarImportDialog } from './CalendarImportDialog'

interface MatchesTabProps {
  league: League
}

function stagePriority(stage: string): number {
  const order = ['FINALS','SEMIFINALS','ROUND4','ROUND3','ROUND2','ROUND1','WEEK6','WEEK5','WEEK4','WEEK3','WEEK2','WEEK1']
  const idx = order.indexOf(stage)
  return idx === -1 ? 99 : idx
}

function stageLatestDate(matches: { match_date: string }[]): string {
  return matches.map(m => m.match_date).sort().at(-1) ?? ''
}

function InlineNote({
  match,
  note,
  threshold,
  onSaved,
}: {
  match: Match & { note?: MatchNote }
  note: MatchNote | undefined
  threshold: number
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const maxPct = Math.round(threshold * 100)
  const currentPct = note ? Math.round(note.note_team1 * 100) : null

  function startEdit() {
    setValue(currentPct !== null ? String(currentPct) : '')
    setEditing(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  async function save() {
    const pct = parseInt(value, 10)
    if (isNaN(pct) || pct < 0 || pct > 100) { setEditing(false); return }
    setSaving(true)
    await upsertNote(
      match.id,
      note?.id,
      pct / 100,
      match.match_date,
      match.team1_id,
      match.team2_id,
    )
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  const noteT2 = currentPct !== null ? 100 - currentPct : null

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Note T1 — éditable */}
      <div className="flex items-center gap-1">
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{match.team1?.name?.split(' ')[0]}</span>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={0}
            max={maxPct}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); save() }
              if (e.key === 'Escape') setEditing(false)
            }}
            disabled={saving}
            className="w-14 text-center text-xs px-1 py-0.5 rounded font-mono"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-accent)',
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Cliquer pour saisir la note"
            className="font-mono text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-70"
            style={currentPct !== null
              ? { background: 'var(--color-line)', color: 'var(--color-ink)' }
              : { background: 'transparent', color: 'var(--color-faint)', border: '1px dashed var(--color-faint)' }
            }
          >
            {currentPct !== null ? `${currentPct}%` : '—'}
          </button>
        )}
      </div>

      {/* Note T2 — affichage seul */}
      <div className="flex items-center gap-1">
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{match.team2?.name?.split(' ')[0]}</span>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded"
          style={noteT2 !== null
            ? { background: 'var(--color-line)', color: 'var(--color-muted)' }
            : { color: 'var(--color-faint)' }
          }
        >
          {noteT2 !== null ? `${noteT2}%` : '—'}
        </span>
      </div>
    </div>
  )
}

export function MatchesTab({ league }: MatchesTabProps) {
  const { teams } = useTeams(league.id)
  const { matches, loading, refetch: refetchMatches } = useMatches(league.id)
  const { notes, refetch: refetchNotes } = useMatchNotes(league.id)
  const [showDialog, setShowDialog] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editMatch, setEditMatch] = useState<(Match & { note?: MatchNote }) | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDialogClose = () => {
    refetchMatches()
    refetchNotes()
    setShowDialog(false)
    setEditMatch(undefined)
  }

  const matchesWithNotes = matches.map(m => ({
    ...m,
    note: notes.find(n => n.match_id === m.id),
  }))

  const grouped = matchesWithNotes.reduce<Record<string, typeof matchesWithNotes>>((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = []
    acc[m.stage].push(m)
    return acc
  }, {})
  // Tri : date la plus récente du stage en primaire (décroissant = stages récents en haut)
  // stagePriority en secondaire (pour départager deux stages à même date, ex : FINALS vs WEEK6 même jour)
  const stagesSorted = Object.keys(grouped).sort((a, b) => {
    const latestA = stageLatestDate(grouped[a])
    const latestB = stageLatestDate(grouped[b])
    if (latestA !== latestB) return latestB.localeCompare(latestA)
    return stagePriority(a) - stagePriority(b)
  })

  if (loading) {
    return <div className="py-16 text-center" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-ink">Matchs — {league.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'var(--color-line)', color: 'var(--color-ink)' }}
          >
            Importer calendrier
          </button>
          <button
            onClick={() => { setEditMatch(undefined); setShowDialog(true) }}
            className="px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bg)' }}
          >
            + Ajouter un match
          </button>
        </div>
      </div>

      {stagesSorted.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
          Aucun match enregistré.
        </div>
      )}

      {stagesSorted.map(stage => (
        <div key={stage} className="panel overflow-hidden">
          {stage && (
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-line)', background: 'var(--color-raised)' }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--color-muted)' }}>
                {stage}
              </span>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                <th className="py-2 px-4 text-left">Date</th>
                <th className="py-2 px-4 text-left">Match</th>
                <th className="py-2 px-4 text-center">Score</th>
                <th className="py-2 px-4 text-center">Notes</th>
                <th className="py-2 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped[stage].map(m => (
                <tr key={m.id} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                  <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--color-muted)' }}>
                    {format(new Date(m.match_date + 'T00:00:00'), 'dd/MM/yy')}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={m.winner_id === m.team1_id ? 'font-bold text-ink' : 'text-muted'}>{m.team1?.name}</span>
                    <span className="mx-2" style={{ color: 'var(--color-muted)' }}>vs</span>
                    <span className={m.winner_id === m.team2_id ? 'font-bold text-ink' : 'text-muted'}>{m.team2?.name}</span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {m.score
                      ? <span className="font-mono text-xs text-ink">{m.score}</span>
                      : <span style={{ color: 'var(--color-muted)' }}>—</span>
                    }
                  </td>
                  <td className="py-1.5 px-4">
                    <InlineNote
                      match={m as Match & { note?: MatchNote }}
                      note={m.note}
                      threshold={league.threshold}
                      onSaved={() => { refetchMatches(); refetchNotes() }}
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setEditMatch(m as Match & { note?: MatchNote }); setShowDialog(true) }}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ background: 'var(--color-line)', color: 'var(--color-muted)' }}
                      >
                        Modifier
                      </button>
                      {confirmDelete === m.id ? (
                        <>
                          <button
                            onClick={async () => { await deleteMatch(m.id); refetchMatches(); refetchNotes(); setConfirmDelete(null) }}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--color-danger)', color: 'var(--color-ink)' }}
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--color-line)', color: 'var(--color-muted)' }}
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(m.id)}
                          className="text-xs px-2 py-1 rounded hover:opacity-80"
                          style={{ background: 'var(--color-line)', color: 'var(--color-loss)' }}
                        >
                          Suppr.
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {showDialog && (
        <MatchDialog
          league={league}
          teams={teams}
          match={editMatch}
          onClose={handleDialogClose}
        />
      )}
      {showImport && (
        <CalendarImportDialog
          league={league}
          teams={teams}
          onDone={() => { refetchMatches(); refetchNotes() }}
          onClose={() => { setShowImport(false); refetchMatches(); refetchNotes() }}
        />
      )}
    </div>
  )
}
