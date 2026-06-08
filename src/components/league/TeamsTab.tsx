import { useState } from 'react'
import type { League, Team } from '@/types'
import { useTeams, useTeamBaselines, deleteTeam } from '@/hooks/useTeams'
import { AddTeamDialog, BaselineDialog } from './TeamDialog'

interface TeamsTabProps {
  league: League
}

function TeamRow({ team, onBaselines }: { team: Team; onBaselines: () => void }) {
  const baselines = useTeamBaselines(team.id)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const latest = baselines[0]

  return (
    <tr className="border-b" style={{ borderColor: 'hsl(216 34% 22%)' }}>
      <td className="py-3 px-4 font-medium text-white">{team.name}</td>
      <td className="py-3 px-4 text-center">
        <span className="font-mono text-sm" style={{ color: 'hsl(217 91% 60%)' }}>
          {latest ? `${Math.round(latest.rating)} ELO` : '1500 ELO'}
        </span>
        {latest && (
          <span className="ml-2 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
            (depuis {latest.effective_date})
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>{baselines.length}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex justify-end gap-1">
          <button
            onClick={onBaselines}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ background: 'hsl(216 34% 22%)', color: 'hsl(215 20% 65%)' }}
          >
            Baselines
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={async () => { await deleteTeam(team.id); setConfirmDelete(false) }}
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
            <button
              onClick={() => setConfirmDelete(true)}
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
}

export function TeamsTab({ league }: TeamsTabProps) {
  const { teams, loading } = useTeams(league.id)
  const [showAdd, setShowAdd] = useState(false)
  const [baselineTeam, setBaselineTeam] = useState<Team | null>(null)
  const baselines = useTeamBaselines(baselineTeam?.id ?? '')

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
                <th className="py-3 px-4 text-left">Équipe</th>
                <th className="py-3 px-4 text-center">Baseline actuelle</th>
                <th className="py-3 px-4 text-center">Nb baselines</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <TeamRow key={team.id} team={team} onBaselines={() => setBaselineTeam(team)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddTeamDialog league={league} onClose={() => setShowAdd(false)} />}
      {baselineTeam && (
        <BaselineDialog
          team={baselineTeam}
          baselines={baselines}
          onClose={() => setBaselineTeam(null)}
        />
      )}
    </div>
  )
}
