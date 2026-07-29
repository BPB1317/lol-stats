import { useState, useRef } from 'react'
import type { League, Team } from '@/types'
import { useTeams, useTeamBaselines, deleteTeam, renameTeam, mergeTeams } from '@/hooks/useTeams'
import { AddTeamDialog, BaselineDialog } from './TeamDialog'

interface TeamsTabProps {
  league: League
}

function TeamRow({ team, allTeams }: { team: Team; allTeams: Team[] }) {
  const { baselines, refetch } = useTeamBaselines(team.id)
  const [showBaselines, setShowBaselines] = useState(false)

  // Rename
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(team.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Merge
  const [merging, setMerging] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeError, setMergeError] = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const latest = baselines[0]

  function startRename() {
    setNameValue(team.name)
    setEditingName(true)
    setTimeout(() => { nameInputRef.current?.focus(); nameInputRef.current?.select() }, 0)
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== team.name) await renameTeam(team.id, trimmed)
    setEditingName(false)
  }

  async function handleMerge() {
    if (!mergeTarget) return
    setMergeLoading(true)
    setMergeError('')
    const err = await mergeTeams(team.id, mergeTarget)
    if (err) { setMergeError(err.message); setMergeLoading(false) }
    else { setMerging(false); setMergeLoading(false) }
  }

  async function handleDelete() {
    const err = await deleteTeam(team.id)
    if (err) { setDeleteError(err.message); setConfirmDelete(false) }
  }

  return (
    <>
      <tr className="border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
        <td className="py-3 px-4 font-medium">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className="rounded px-2 py-0.5 text-sm text-white outline-none w-full max-w-xs"
              style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(217 91% 60%)' }}
            />
          ) : (
            <button
              onClick={startRename}
              title="Cliquer pour renommer"
              className="text-white hover:text-blue-400 transition-colors text-left"
            >
              {team.name}
            </button>
          )}
        </td>
        <td className="py-3 px-4 text-center">
          <span className="font-mono text-sm" style={{ color: 'hsl(217 91% 60%)' }}>
            {latest ? `${Math.round(latest.rating)} ELO` : '1500 ELO'}
          </span>
          {latest && (
            <span className="ml-2 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
              ({latest.bo_type} · {latest.effective_date})
            </span>
          )}
        </td>
        <td className="py-3 px-4 text-center">
          <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>{baselines.length}</span>
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex flex-wrap justify-end items-center gap-1">
            {merging ? (
              <>
                <select
                  value={mergeTarget}
                  onChange={e => setMergeTarget(e.target.value)}
                  className="rounded px-2 py-1 text-xs text-white outline-none"
                  style={{ background: 'hsl(222 47% 11%)', border: '1px solid hsl(216 34% 22%)' }}
                >
                  <option value="">→ fusionner dans…</option>
                  {allTeams.filter(t => t.id !== team.id).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleMerge}
                  disabled={!mergeTarget || mergeLoading}
                  className="text-xs px-2 py-1 rounded disabled:opacity-40"
                  style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 47% 11%)' }}
                >
                  {mergeLoading ? '…' : 'Fusionner'}
                </button>
                <button
                  onClick={() => { setMerging(false); setMergeError('') }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                >
                  ✕
                </button>
                {mergeError && <p className="w-full text-xs text-red-400 mt-1">{mergeError}</p>}
              </>
            ) : confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'hsl(0 72% 51%)', color: 'white' }}
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowBaselines(true)}
                  className="text-xs px-2 py-1 rounded hover:opacity-80"
                  style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
                >
                  Baselines
                </button>
                <button
                  onClick={() => { setMerging(true); setMergeTarget(''); setMergeError('') }}
                  className="text-xs px-2 py-1 rounded hover:opacity-80"
                  style={{ background: 'hsl(216 34% 22%)', color: 'hsl(38 92% 70%)' }}
                >
                  Fusionner
                </button>
                <button
                  onClick={() => { setConfirmDelete(true); setDeleteError('') }}
                  className="text-xs px-2 py-1 rounded hover:opacity-80"
                  style={{ background: 'hsl(216 34% 22%)', color: '#f87171' }}
                >
                  Suppr.
                </button>
              </>
            )}
            {deleteError && <p className="w-full text-xs text-red-400 mt-1">{deleteError}</p>}
          </div>
        </td>
      </tr>
      {showBaselines && (
        <BaselineDialog
          team={team}
          baselines={baselines}
          onRefetch={refetch}
          onClose={() => setShowBaselines(false)}
        />
      )}
    </>
  )
}

export function TeamsTab({ league }: TeamsTabProps) {
  const { teams, loading } = useTeams(league.id)
  const [showAdd, setShowAdd] = useState(false)

  if (loading) {
    return <div className="py-16 text-center" style={{ color: 'hsl(215 20% 65%)' }}>Chargement…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-white">Équipes — {league.name}</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-2 text-sm rounded-lg font-medium"
          style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
        >
          + Ajouter une équipe
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        {teams.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'hsl(215 20% 65%)' }}>
            Aucune équipe. Cliquez sur "Ajouter une équipe".
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs" style={{ borderColor: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}>
                <th className="py-3 px-4 text-left">Équipe <span className="font-normal opacity-60">(clic pour renommer)</span></th>
                <th className="py-3 px-4 text-center">Baseline actuelle</th>
                <th className="py-3 px-4 text-center">Nb baselines</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <TeamRow key={team.id} team={team} allTeams={teams} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddTeamDialog league={league} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
