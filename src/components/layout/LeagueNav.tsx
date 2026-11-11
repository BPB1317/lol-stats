// Ligues en ligne, sous l'en-tête de la section Modèles (dernière mise à jour en premier) :
// sélection, masquage (préférence locale), suppression, ajout.
import { useState } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'
import type { League } from '@/types'
import { deleteLeague } from '@/hooks/useLeagues'
import { AddLeagueDialog } from './AddLeagueDialog'
import { loadHiddenLeagues, saveHiddenLeagues } from '@/lib/hiddenLeagues'

export function LeagueNav({ leagues }: { leagues: League[] }) {
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
  const link = (active: boolean) => `shrink-0 py-1 ${active ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`

  return (
    <>
      {(manage ? leagues : leagues.filter(l => !hidden.has(l.id))).map(l => manage ? (
        <span key={l.id} className="flex shrink-0 items-center gap-1.5 py-1">
          <span className={hidden.has(l.id) ? 'text-faint line-through' : 'text-ink'}>{l.short_name} <span className="font-mono text-[11px] text-faint">{l.season}</span></span>
          <button onClick={() => toggleHide(l.id)} className="text-[11px] text-muted underline underline-offset-2 hover:text-ink">{hidden.has(l.id) ? 'afficher' : 'masquer'}</button>
          {confirmId === l.id
            ? <><button onClick={() => remove(l.id)} className="bg-loss px-1.5 text-[11px] text-bg">supprimer</button><button onClick={() => setConfirmId(null)} className="text-[11px] text-muted">non</button></>
            : <button onClick={() => setConfirmId(l.id)} className="text-[11px] text-loss" aria-label={`Supprimer ${l.name}`}>×</button>}
        </span>
      ) : (
        <NavLink key={l.id} to={`/modeles/${l.id}`} className={() => link(l.id === leagueId)}>
          {l.short_name} <span className="font-mono text-[11px] text-faint">{l.season}</span>
        </NavLink>
      ))}
      <button onClick={() => setShowAdd(true)} className="shrink-0 py-1 text-faint hover:text-ink">+ Ligue</button>
      <button onClick={() => { setManage(m => !m); setConfirmId(null) }} className={`shrink-0 py-1 ${manage ? 'text-accent' : 'text-faint hover:text-ink'}`}>{manage ? 'Terminé' : 'Gérer'}</button>
      {error && <span className="shrink-0 text-xs text-loss">Erreur : {error}</span>}
      {showAdd && <AddLeagueDialog onClose={() => setShowAdd(false)} leagues={leagues} maxOrder={leagues.reduce((m, l) => Math.max(m, l.sort_order), 0)} />}
    </>
  )
}
