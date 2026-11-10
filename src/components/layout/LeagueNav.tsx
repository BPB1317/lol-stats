// Liste des ligues dans le menu latéral : sélection, masquage (préférence locale), suppression, ajout.
import { useState } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'
import type { League } from '@/types'
import { deleteLeague } from '@/hooks/useLeagues'
import { AddLeagueDialog } from './AddLeagueDialog'
import { loadHiddenLeagues, saveHiddenLeagues } from '@/lib/hiddenLeagues'

export function LeagueNav({ leagues, onNavigate }: { leagues: League[]; onNavigate?: () => void }) {
  const [manage, setManage] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(loadHiddenLeagues)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const navigate = useNavigate()
  const leagueId = useMatch('/modeles/:leagueId/*')?.params.leagueId

  const toggleHide = (id: string) => {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    saveHiddenLeagues(next)
    setHidden(next)
  }

  const remove = async (id: string) => {
    setError('')
    const err = await deleteLeague(id)
    if (err) { setError(err.message); return }
    setConfirmId(null)
    if (id === leagueId) navigate('/modeles')
  }

  const list = manage ? leagues : leagues.filter(l => !hidden.has(l.id))

  return (
    <div>
      {list.map(l => manage ? (
        <div key={l.id} className="flex items-center gap-1 px-3 py-1 text-[13px]">
          <span className={`min-w-0 flex-1 truncate ${hidden.has(l.id) ? 'text-faint line-through' : 'text-ink'}`}>{l.name}</span>
          <button onClick={() => toggleHide(l.id)} className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:text-ink">{hidden.has(l.id) ? 'Afficher' : 'Masquer'}</button>
          {confirmId === l.id ? (
            <>
              <button onClick={() => remove(l.id)} className="rounded bg-danger px-1.5 py-0.5 text-[11px] text-ink">Supprimer</button>
              <button onClick={() => setConfirmId(null)} className="rounded px-1.5 py-0.5 text-[11px] text-muted">Non</button>
            </>
          ) : (
            <button onClick={() => setConfirmId(l.id)} className="rounded px-1.5 py-0.5 text-[11px] text-loss" aria-label={`Supprimer ${l.name}`}>×</button>
          )}
        </div>
      ) : (
        <NavLink
          key={l.id}
          to={`/modeles/${l.id}`}
          onClick={onNavigate}
          className={({ isActive }) => `flex items-baseline justify-between gap-2 rounded-md px-3 py-1.5 text-[13px] ${isActive ? 'bg-raised text-ink shadow-[inset_2px_0_0_var(--color-accent)]' : 'text-muted hover:text-ink'}`}
        >
          <span className="truncate">{l.short_name}</span>
          <span className="shrink-0 font-mono text-[11px] text-faint">{l.season}</span>
        </NavLink>
      ))}
      {error && <div className="px-3 py-1 text-xs text-loss">Erreur : {error}</div>}
      <div className="flex gap-1 px-3 pt-1">
        <button onClick={() => setShowAdd(true)} className="text-[12px] text-faint hover:text-ink">+ Ligue</button>
        <span className="text-faint">·</span>
        <button onClick={() => { setManage(m => !m); setConfirmId(null) }} className={`text-[12px] ${manage ? 'text-accent' : 'text-faint hover:text-ink'}`}>{manage ? 'Terminé' : 'Gérer'}</button>
      </div>
      {showAdd && <AddLeagueDialog onClose={() => setShowAdd(false)} leagues={leagues} maxOrder={leagues.reduce((m, l) => Math.max(m, l.sort_order), 0)} />}
    </div>
  )
}
