import { useState } from 'react'
import { format } from 'date-fns'
import type { League, Team, TeamBaseline } from '@/types'
import { addTeam, addBaseline, deleteBaseline } from '@/hooks/useTeams'

interface AddTeamDialogProps {
  league: League
  onClose: () => void
}

export function AddTeamDialog({ league, onClose }: AddTeamDialogProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const err = await addTeam({ league_id: league.id, name: name.trim() })
    if (err) { setError(err.message); setLoading(false); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h3 className="font-semibold text-white text-sm">Ajouter une équipe</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Nom de l'équipe</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="ex: Fnatic"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50" style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}>
              {loading ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface BaselineDialogProps {
  team: Team
  baselines: TeamBaseline[]
  onClose: () => void
}

export function BaselineDialog({ team, baselines, onClose }: BaselineDialogProps) {
  const [rating, setRating] = useState(1500)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await addBaseline({ team_id: team.id, rating, effective_date: date })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h3 className="font-semibold text-white text-sm">Baselines — {team.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <form onSubmit={handleAdd} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>ELO Input (ex: 1500)</label>
              <input
                type="number"
                min="0" max="9999" step="1"
                value={rating}
                onChange={e => setRating(parseInt(e.target.value))}
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Date effective</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)', colorScheme: 'dark' }}
              />
            </div>
            <button type="submit" disabled={loading} className="px-3 py-2 text-sm rounded-lg font-medium disabled:opacity-50 whitespace-nowrap" style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}>
              + Ajouter
            </button>
          </form>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {baselines.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'hsl(215 20% 65%)' }}>Aucune baseline (défaut: 1500 ELO)</p>
            )}
            {baselines.map(b => (
              <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'hsl(222 47% 11%)' }}>
                <span className="text-sm text-white font-mono">{Math.round(b.rating)} ELO</span>
                <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>{format(new Date(b.effective_date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                <button onClick={() => deleteBaseline(b.id)} className="text-xs text-red-400 hover:text-red-300">Suppr.</button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
