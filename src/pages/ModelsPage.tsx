// Section « Modèles » : une ligue (Classement, GDM, Matchs, Équipes). Les écrans des modèles sont repris tels quels.
import { Navigate, NavLink, useParams } from 'react-router-dom'
import type { League } from '@/types'
import { RankingTab } from '@/components/league/RankingTab'
import { MatchesTab } from '@/components/league/MatchesTab'
import { TeamsTab } from '@/components/league/TeamsTab'
import { GdmTab } from '@/components/league/GdmTab'
import { loadHiddenLeagues } from '@/lib/hiddenLeagues'

const TABS = [
  { key: 'classement', label: 'Classement' },
  { key: 'gdm', label: 'GDM' },
  { key: 'matchs', label: 'Matchs' },
  { key: 'equipes', label: 'Équipes' },
] as const

export function ModelsPage({ leagues, loading }: { leagues: League[]; loading: boolean }) {
  const { leagueId, tab = 'classement' } = useParams()

  if (loading) return <div className="py-16 text-center text-muted">Chargement…</div>
  if (!leagues.length) return <div className="py-16 text-center text-muted">Aucune ligue. Ajoutez-en une depuis le menu (« + Ligue »).</div>

  const league = leagues.find(l => l.id === leagueId)
  if (!league) {
    const hidden = loadHiddenLeagues()
    const first = leagues.find(l => !hidden.has(l.id)) ?? leagues[0]
    return <Navigate to={`/modeles/${first.id}`} replace />
  }
  if (!TABS.some(t => t.key === tab)) return <Navigate to={`/modeles/${league.id}`} replace />

  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map(t => (
          <NavLink key={t.key} end to={t.key === 'classement' ? `/modeles/${league.id}` : `/modeles/${league.id}/${t.key}`}
            className={({ isActive }) => `pill px-3 py-1.5 text-xs ${isActive ? 'border-ink bg-ink text-bg' : ''}`}>
            {t.key === 'gdm' ? `${league.short_name} GDM` : t.label}
          </NavLink>
        ))}
        <span className="ml-auto font-mono text-xs text-faint">seuil {Math.round(league.threshold * 100)} %</span>
      </div>
      {tab === 'classement' && <RankingTab league={league} />}
      {tab === 'gdm' && <GdmTab league={league} />}
      {tab === 'matchs' && <MatchesTab league={league} />}
      {tab === 'equipes' && <TeamsTab league={league} />}
    </main>
  )
}

