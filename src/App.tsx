import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { LoginForm } from '@/components/auth/LoginForm'
import { Layout } from '@/components/layout/Layout'
import { LeagueTabs } from '@/components/layout/LeagueTabs'
import { useLeagues } from '@/hooks/useLeagues'
import { RankingTab } from '@/components/league/RankingTab'
import { MatchesTab } from '@/components/league/MatchesTab'
import { TeamsTab } from '@/components/league/TeamsTab'
import { GdmTab } from '@/components/league/GdmTab'

type SubTab = 'ranking' | 'gdm' | 'matches' | 'teams'

// Composant séparé : monté uniquement après authentification
// → les hooks Supabase s'exécutent avec une session active, RLS OK
function AuthenticatedApp({ session }: { session: Session }) {
  const [activeLeagueId, setActiveLeagueId] = useState<string>('')
  const [subTab, setSubTab] = useState<SubTab>('ranking')
  const { leagues, loading: leaguesLoading } = useLeagues()

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(leagues[0].id)
    }
  }, [leagues, activeLeagueId])

  const activeLeague = leagues.find(l => l.id === activeLeagueId)

  return (
    <Layout userEmail={session.user.email}>
      <LeagueTabs
        leagues={leagues}
        activeId={activeLeagueId}
        onSelect={id => { setActiveLeagueId(id); setSubTab('ranking') }}
      />

      {leaguesLoading ? (
        <div className="py-16 text-center" style={{ color: 'hsl(215 20% 65%)' }}>Chargement…</div>
      ) : !activeLeague ? (
        <div className="py-16 text-center" style={{ color: 'hsl(215 20% 65%)' }}>
          Aucune ligue. Cliquez sur "+" pour en créer une.
        </div>
      ) : (
        <div className="flex flex-col flex-1 p-4 gap-4">
          <div className="flex gap-1">
            {(['ranking', 'gdm', 'matches', 'teams'] as SubTab[]).map(tab => {
              const labels: Record<SubTab, string> = {
                ranking: 'Classement',
                gdm: `${activeLeague.short_name} GDM`,
                matches: 'Matchs',
                teams: 'Équipes',
              }
              return (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab)}
                  className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                  style={subTab === tab
                    ? { background: 'hsl(216 34% 22%)', color: 'white', fontWeight: 600 }
                    : { background: 'transparent', color: 'hsl(215 20% 65%)' }
                  }
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>

          {subTab === 'ranking' && <RankingTab league={activeLeague} />}
          {subTab === 'gdm' && <GdmTab league={activeLeague} />}
          {subTab === 'matches' && <MatchesTab league={activeLeague} />}
          {subTab === 'teams' && <TeamsTab league={activeLeague} />}
        </div>
      )}
    </Layout>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!authChecked) return null
  if (!session) return <LoginForm />
  return <AuthenticatedApp session={session} />
}

export default App
