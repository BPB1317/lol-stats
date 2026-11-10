import { useState } from 'react'
import { format } from 'date-fns'
import type { League, Team, TeamBaseline } from '@/types'
import { addTeam, addBaseline, deleteBaseline, updateBaselineBoType, updateBaselineDate } from '@/hooks/useTeams'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(5 8 15 / 0.75)' }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
          <h3 className="font-semibold text-ink text-sm">Ajouter une équipe</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Nom de l'équipe</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="ex: Fnatic"
              className="w-full rounded-lg px-3 py-2 text-sm text-ink outline-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
            />
          </div>
          {error && <p className="text-sm text-loss">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--color-line)', color: 'var(--color-muted)' }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50" style={{ background: 'var(--color-ink)', color: 'var(--color-bg)' }}>
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
  onRefetch: () => void
  onClose: () => void
}

const BO_TYPES = ['BO1', 'BO3', 'BO5'] as const
type BoType = typeof BO_TYPES[number]

export function BaselineDialog({ team, baselines, onRefetch, onClose }: BaselineDialogProps) {
  const [rating, setRating] = useState(1500)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [boType, setBoType] = useState<BoType>('BO3')
  const [loading, setLoading] = useState(false)
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [editingDateValue, setEditingDateValue] = useState('')

  const saveDate = async (id: string, value: string) => {
    if (value) { await updateBaselineDate(id, value); onRefetch() }
    setEditingDateId(null)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await addBaseline({ team_id: team.id, rating, effective_date: date, bo_type: boType })
    onRefetch()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(5 8 15 / 0.75)' }}>
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
          <h3 className="font-semibold text-ink text-sm">Baselines — {team.name}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ELO Input</label>
                <input
                  type="number"
                  min="0" max="9999" step="1"
                  value={rating}
                  onChange={e => setRating(parseInt(e.target.value))}
                  className="w-full rounded-lg px-2 py-2 text-sm text-ink outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Date effective</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg px-2 py-2 text-sm text-ink outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Type de BO</label>
                <div className="flex gap-1">
                  {BO_TYPES.map(bo => (
                    <button
                      key={bo}
                      type="button"
                      onClick={() => setBoType(bo)}
                      className="px-3 py-1.5 text-xs rounded-lg font-medium"
                      style={boType === bo
                        ? { background: 'var(--color-accent)', color: 'var(--color-bg)' }
                        : { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-line)' }
                      }
                    >
                      {bo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex justify-end items-end">
                <button type="submit" disabled={loading} className="px-3 py-2 text-sm rounded-lg font-medium disabled:opacity-50 whitespace-nowrap" style={{ background: 'var(--color-ink)', color: 'var(--color-bg)' }}>
                  + Ajouter
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {baselines.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--color-muted)' }}>Aucune baseline — l'équipe n'apparaîtra pas dans le classement</p>
            )}
            {baselines.map(b => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                <span className="text-sm text-ink font-mono shrink-0">{Math.round(b.rating)} ELO</span>
                <div className="flex gap-0.5 shrink-0">
                  {BO_TYPES.map(bo => (
                    <button
                      key={bo}
                      type="button"
                      onClick={() => { updateBaselineBoType(b.id, bo); onRefetch() }}
                      className="px-1.5 py-0.5 rounded font-medium transition-colors"
                      style={{
                        fontSize: '0.65rem',
                        background: b.bo_type === bo ? 'var(--color-accent)' : 'var(--color-raised)',
                        color: b.bo_type === bo ? 'var(--color-bg)' : 'var(--color-muted)',
                      }}
                    >
                      {bo}
                    </button>
                  ))}
                </div>
                {editingDateId === b.id ? (
                  <input
                    type="date"
                    autoFocus
                    value={editingDateValue}
                    onChange={e => setEditingDateValue(e.target.value)}
                    onBlur={() => saveDate(b.id, editingDateValue)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveDate(b.id, editingDateValue)
                      if (e.key === 'Escape') setEditingDateId(null)
                    }}
                    className="flex-1 rounded px-1.5 py-0.5 text-xs text-ink outline-none"
                    style={{ background: 'var(--color-line)', border: '1px solid var(--color-accent)', minWidth: 0 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingDateId(b.id); setEditingDateValue(b.effective_date) }}
                    className="flex-1 text-left text-xs hover:text-ink transition-colors"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {format(new Date(b.effective_date + 'T00:00:00'), 'dd/MM/yyyy')}
                  </button>
                )}
                <button onClick={() => { deleteBaseline(b.id); onRefetch() }} className="text-xs text-loss hover:opacity-80 shrink-0">Suppr.</button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--color-line)', color: 'var(--color-muted)' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
