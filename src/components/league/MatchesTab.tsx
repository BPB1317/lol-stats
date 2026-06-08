import { useState } from 'react'
import { format } from 'date-fns'
import type { League, Match, MatchNote } from '@/types'
import { useTeams } from '@/hooks/useTeams'
import { useMatches, useMatchNotes, deleteMatch } from '@/hooks/useMatches'
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

  // Grouper par stage
  const grouped = matchesWithNotes.reduce<Record<string, typeof matchesWithNotes>>((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = []
    acc[m.stage].push(m)
    return acc
  }, {})
  const stagesSorted = Object.keys(grouped).sort((a, b) => stagePriority(a) - stagePriority(b))

  if (loading) {
    return <div className="py-16 text-center" style={{ color: 'hsl(215 20% 65%)' }}>Chargement…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-white">Matchs — {league.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 85%)' }}
          >
            Importer calendrier
          </button>
          <button
            onClick={() => { setEditMatch(undefined); setShowDialog(true) }}
            className="px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
          >
            + Ajouter un match
          </button>
        </div>
      </div>

      {stagesSorted.length === 0 && (
        <div className="text-center py-16" style={{ color: 'hsl(215 20% 65%)' }}>
          Aucun match enregistré. Cliquez sur "Ajouter un match".
        </div>
      )}

      {stagesSorted.map(stage => (
        <div key={stage} className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
          <div className="px-4 py-2 border-b" style={{ borderColor: 'hsl(216 34% 22%)', background: 'hsl(222 47% 16%)' }}>
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'hsl(217 91% 60%)' }}>
              {stage}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs" style={{ borderColor: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
                <th className="py-2 px-4 text-left">Date</th>
                <th className="py-2 px-4 text-left">Match</th>
                <th className="py-2 px-4 text-center">Score</th>
                <th className="py-2 px-4 text-center">Note T1</th>
                <th className="py-2 px-4 text-center">Note T2</th>
                <th className="py-2 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped[stage].map(m => {
                const noteT2 = m.note ? parseFloat((1 - m.note.note_team1).toFixed(3)) : null
                return (
                  <tr key={m.id} className="border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
                    <td className="py-2.5 px-4 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                      {format(new Date(m.match_date + 'T00:00:00'), 'dd/MM/yy')}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={m.winner_id === m.team1_id ? 'font-bold text-white' : 'text-gray-400'}>{m.team1?.name}</span>
                      <span className="mx-2" style={{ color: 'hsl(215 20% 65%)' }}>vs</span>
                      <span className={m.winner_id === m.team2_id ? 'font-bold text-white' : 'text-gray-400'}>{m.team2?.name}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {m.score
                        ? <span className="font-mono text-xs text-white">{m.score}</span>
                        : <span style={{ color: 'hsl(215 20% 65%)' }}>—</span>
                      }
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {m.note
                        ? <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(217 91% 60%)' }}>
                            {(m.note.note_team1 * 100).toFixed(0)}%
                          </span>
                        : <span style={{ color: 'hsl(215 20% 65%)' }}>—</span>
                      }
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {noteT2 !== null
                        ? <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
                            {(noteT2 * 100).toFixed(0)}%
                          </span>
                        : <span style={{ color: 'hsl(215 20% 65%)' }}>—</span>
                      }
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setEditMatch(m as Match & { note?: MatchNote }); setShowDialog(true) }}
                          className="text-xs px-2 py-1 rounded hover:opacity-80"
                          style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                        >
                          Modifier
                        </button>
                        {confirmDelete === m.id ? (
                          <>
                            <button
                              onClick={async () => { await deleteMatch(m.id); refetchMatches(); refetchNotes(); setConfirmDelete(null) }}
                              className="text-xs px-2 py-1 rounded"
                              style={{ background: 'hsl(0 72% 51%)', color: 'white' }}
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs px-2 py-1 rounded"
                              style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(m.id)}
                            className="text-xs px-2 py-1 rounded hover:opacity-80"
                            style={{ background: 'hsl(216 34% 22%)', color: '#f87171' }}
                          >
                            Suppr.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
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
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
