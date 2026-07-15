import { useState } from 'react'
import { format } from 'date-fns'
import type { League, Team, Match, MatchNote } from '@/types'
import { addMatch, updateMatch } from '@/hooks/useMatches'

const STAGES = ['WEEK1','WEEK2','WEEK3','WEEK4','WEEK5','WEEK6','ROUND1','ROUND2','ROUND3','ROUND4','SEMIFINALS','FINALS']

interface MatchDialogProps {
  league: League
  teams: Team[]
  match?: Match & { note?: MatchNote }
  onClose: () => void
}

export function MatchDialog({ league, teams, match, onClose }: MatchDialogProps) {
  const [team1Id, setTeam1Id] = useState(match?.team1_id ?? '')
  const [team2Id, setTeam2Id] = useState(match?.team2_id ?? '')
  const [winnerId, setWinnerId] = useState(match?.winner_id ?? '')
  const [score, setScore] = useState(match?.score ?? '')
  const [stage, setStage] = useState(match?.stage ?? 'WEEK1')
  const [matchDate, setMatchDate] = useState(match?.match_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [noteTeam1, setNoteTeam1] = useState(match?.note?.note_team1 ?? 0.5)
  const [noteDate, setNoteDate] = useState(match?.note?.note_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [hasNote, setHasNote] = useState(!!match?.note)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const team1 = teams.find(t => t.id === team1Id)
  const team2 = teams.find(t => t.id === team2Id)
  const noteTeam2 = parseFloat((1 - noteTeam1).toFixed(3))

  const handleScoreChange = (value: string) => {
    setScore(value)
    const m = value.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (m && team1Id && team2Id) {
      const s1 = parseInt(m[1]), s2 = parseInt(m[2])
      if (s1 > s2) setWinnerId(team1Id)
      else if (s2 > s1) setWinnerId(team2Id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team1Id || !team2Id || team1Id === team2Id) {
      setError('Sélectionnez deux équipes différentes.')
      return
    }
    setLoading(true)
    setError('')

    const matchData = {
      league_id: league.id,
      team1_id: team1Id,
      team2_id: team2Id,
      winner_id: winnerId || null,
      score: score || null,
      stage,
      match_date: matchDate,
      source: 'manual' as const,
    }

    const noteData = hasNote ? { note_team1: noteTeam1, note_date: noteDate } : undefined

    const err = match
      ? await updateMatch(match.id, matchData, noteData ? { ...noteData, id: match.note?.id, team1_id: team1Id, team2_id: team2Id } : undefined)
      : await addMatch(matchData, noteData)

    if (err) { setError(err.message); setLoading(false); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h3 className="font-semibold text-white text-sm">{match ? 'Modifier le match' : 'Ajouter un match'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Équipe 1</label>
              <select
                value={team1Id}
                onChange={e => setTeam1Id(e.target.value)}
                required
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              >
                <option value="">Sélectionner…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Équipe 2</label>
              <select
                value={team2Id}
                onChange={e => setTeam2Id(e.target.value)}
                required
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              >
                <option value="">Sélectionner…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Vainqueur</label>
              <select
                value={winnerId}
                onChange={e => setWinnerId(e.target.value)}
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              >
                <option value="">—</option>
                {team1 && <option value={team1.id}>{team1.name}</option>}
                {team2 && <option value={team2.id}>{team2.name}</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Score</label>
              <input
                type="text"
                value={score}
                onChange={e => handleScoreChange(e.target.value)}
                placeholder="3-0"
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value)}
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Date du match</label>
            <input
              type="date"
              value={matchDate}
              onChange={e => setMatchDate(e.target.value)}
              required
              className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
              style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)', colorScheme: 'dark' }}
            />
          </div>

          <div className="rounded-lg p-3 space-y-3" style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)' }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasNote"
                checked={hasNote}
                onChange={e => setHasNote(e.target.checked)}
                className="accent-blue-500"
              />
              <label htmlFor="hasNote" className="text-xs font-medium text-white">Ajouter une note de performance</label>
            </div>

            {hasNote && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-2" style={{ color: 'hsl(215 20% 65%)' }}>
                    <span>{team1?.name ?? 'Équipe 1'}: <strong className="text-white">{(noteTeam1 * 100).toFixed(0)}%</strong></span>
                    <span>{team2?.name ?? 'Équipe 2'}: <strong className="text-white">{(noteTeam2 * 100).toFixed(0)}%</strong></span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={league.threshold}
                    step="0.01"
                    value={noteTeam1}
                    onChange={e => setNoteTeam1(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(215 20% 65%)' }}>
                    <span>0%</span>
                    <span>Seuil max: {(league.threshold * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Date de la note</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={e => setNoteDate(e.target.value)}
                    className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                    style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50"
              style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
            >
              {loading ? 'Enregistrement…' : (match ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
