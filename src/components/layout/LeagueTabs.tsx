import { useState } from 'react'
import type { League } from '@/types'
import { addLeague } from '@/hooks/useLeagues'

interface AddLeagueDialogProps {
  onClose: () => void
  maxOrder: number
}

function AddLeagueDialog({ onClose, maxOrder }: AddLeagueDialogProps) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [season, setSeason] = useState('SP26')
  const [threshold, setThreshold] = useState(0.85)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const err = await addLeague({
      name: name.trim(),
      short_name: shortName.trim(),
      season,
      threshold,
      sort_order: maxOrder + 1,
    })
    if (err) { setError(err.message); setLoading(false); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
          <h3 className="font-semibold text-white text-sm">Ajouter une ligue</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Nom complet</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="ex: LEC SP26"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Abréviation</label>
              <input
                type="text" value={shortName} onChange={e => setShortName(e.target.value)} required
                placeholder="LEC"
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Saison</label>
              <input
                type="text" value={season} onChange={e => setSeason(e.target.value)} required
                placeholder="SP26"
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'hsl(216 34% 18%)', border: '1px solid hsl(216 34% 22%)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Seuil max ({(threshold * 100).toFixed(0)}%)</label>
            <input
              type="range" min="0.5" max="1" step="0.05"
              value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(215 20% 65%)' }}>
              <span>50%</span><span>75%</span><span>85%</span><span>90%</span><span>100%</span>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50" style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}>
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface LeagueTabsProps {
  leagues: League[]
  activeId: string
  onSelect: (id: string) => void
}

export function LeagueTabs({ leagues, activeId, onSelect }: LeagueTabsProps) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto" style={{ borderColor: 'hsl(216 34% 22%)', background: 'hsl(222 47% 12%)' }}>
        {leagues.map(l => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            className="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors"
            style={activeId === l.id
              ? { background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)', fontWeight: 600 }
              : { background: 'transparent', color: 'hsl(215 20% 65%)' }
            }
          >
            {l.short_name} <span className="text-xs opacity-70">{l.season}</span>
          </button>
        ))}
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:opacity-80 ml-2"
          style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
          title="Ajouter une ligue"
        >
          +
        </button>
      </div>
      {showAdd && (
        <AddLeagueDialog
          onClose={() => setShowAdd(false)}
          maxOrder={leagues.reduce((max, l) => Math.max(max, l.sort_order), 0)}
        />
      )}
    </>
  )
}
