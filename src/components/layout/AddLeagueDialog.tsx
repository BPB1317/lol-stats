// Ajout d'une ligue. Option : reprendre les équipes d'une ligue précédente (ligues franchisées),
// avec ou sans leur dernier Elo d'entrée, pour ne saisir que ce qui change.
import { useState } from 'react'
import type { League } from '@/types'
import { createLeague, copyTeams } from '@/hooks/useLeagues'
import { todayLocal } from '@/lib/date'

interface AddLeagueDialogProps {
  onClose: () => void
  maxOrder: number
  leagues: League[]
}

export function AddLeagueDialog({ onClose, maxOrder, leagues }: AddLeagueDialogProps) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [season, setSeason] = useState('SP26')
  const [threshold, setThreshold] = useState(0.85)
  const [fromId, setFromId] = useState('')
  const [withElo, setWithElo] = useState(false)
  const [eloDate, setEloDate] = useState(todayLocal())
  const [boType, setBoType] = useState('BO1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { id, error: err } = await createLeague({ name: name.trim(), short_name: shortName.trim(), season, threshold, sort_order: maxOrder + 1 })
    if (err || !id) { setError(err?.message ?? 'Création impossible'); setLoading(false); return }
    if (fromId) {
      const r = await copyTeams(fromId, id, withElo ? { date: eloDate, boType } : undefined)
      if (r.error) { setError(`Ligue créée, mais reprise des équipes incomplète : ${r.error.message}`); setLoading(false); return }
    }
    onClose()
  }

  // Ligue source suggérée : la plus récente avec la même abréviation
  const sameShort = leagues.filter(l => l.short_name.toLowerCase() === shortName.trim().toLowerCase()).sort((a, b) => b.sort_order - a.sort_order)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(5 8 15 / 0.6)' }}>
      <div className="panel w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-sm font-semibold">Ajouter une ligue</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Fermer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <label className="block"><span className="mb-1 block text-xs text-muted">Nom complet</span>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex : LEC WI27" className="field w-full px-3 py-2 text-sm" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Abréviation</span>
              <input value={shortName} onChange={e => setShortName(e.target.value)} required placeholder="LEC" className="field w-full px-3 py-2 text-sm" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Saison</span>
              <input value={season} onChange={e => setSeason(e.target.value)} required placeholder="SP26" className="field w-full px-3 py-2 text-sm" /></label>
          </div>
          <div>
            <span className="mb-1 block text-xs text-muted">Seuil max ({(threshold * 100).toFixed(0)} %)</span>
            <input type="range" min="0.5" max="1" step="0.05" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2 border-t border-line pt-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Reprendre les équipes de</span>
              <select value={fromId} onChange={e => setFromId(e.target.value)} className="field w-full px-2 py-2 text-sm">
                <option value="">— aucune (équipes saisies à la main)</option>
                {sameShort.length > 0 && <optgroup label="Même abréviation">{sameShort.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>}
                <optgroup label="Toutes les ligues">{leagues.filter(l => !sameShort.includes(l)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>
              </select></label>
            {fromId && (
              <>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withElo} onChange={e => setWithElo(e.target.checked)} /> avec leur dernier Elo d'entrée</label>
                {withElo && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mb-1 block text-xs text-muted">Daté du</span>
                      <input type="date" value={eloDate} onChange={e => setEloDate(e.target.value)} className="field w-full px-2 py-1.5 font-mono text-sm" /></label>
                    <label className="block"><span className="mb-1 block text-xs text-muted">Format</span>
                      <select value={boType} onChange={e => setBoType(e.target.value)} className="field w-full px-2 py-1.5 text-sm">
                        {['BO1', 'BO3', 'BO5'].map(b => <option key={b}>{b}</option>)}
                      </select></label>
                  </div>
                )}
                <p className="text-xs text-faint">Vous pourrez ensuite retirer, renommer ou ajuster chaque équipe dans l'onglet Équipes.</p>
              </>
            )}
          </div>

          {error && <p className="text-sm text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Création…' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
