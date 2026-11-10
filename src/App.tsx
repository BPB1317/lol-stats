import { useState, useEffect, lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { LoginForm } from '@/components/auth/LoginForm'
import { AppShell } from '@/components/layout/AppShell'
import { useLeagues, useLeagueActivity, sortByActivity } from '@/hooks/useLeagues'
import { ModelsPage } from '@/pages/ModelsPage'
import { JournalPage } from '@/pages/JournalPage'
import { VuPasPrisPage } from '@/pages/VuPasPrisPage'
import { BilanPage } from '@/pages/BilanPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PartagePage } from '@/pages/PartagePage'
import { TennisEloPage } from '@/pages/TennisEloPage'
import { CalculatorsPage } from '@/pages/CalculatorsPage'
import { BetFormHost } from '@/components/bets/BetFormHost'
import { useBets, useProfile } from '@/hooks/useBetting'
import { SessionContext } from '@/lib/session'

// Drafts de DA (données fictives) : chargés à la demande, hors du bundle principal
const DraftsPage = lazy(() => import('@/drafts/DraftsPage'))

// Composant monté uniquement après authentification → les hooks Supabase s'exécutent avec une session active (RLS)
function AuthenticatedApp({ session }: { session: Session }) {
  const { leagues: rawLeagues, loading } = useLeagues()
  // Ligues « dernière mise à jour en premier » : menu et ligue ouverte par défaut
  const activity = useLeagueActivity(rawLeagues)
  const leagues = sortByActivity(rawLeagues, activity)
  const { bets, loading: betsLoading } = useBets()
  const person = useProfile(session.user.id)

  return (
    <SessionContext.Provider value={{ userId: session.user.id, email: session.user.email, person }}>
    <AppShell leagues={leagues} bets={bets} userId={session.user.id} who={person ?? session.user.email}>
      <Routes>
        <Route path="/" element={<Navigate to="/modeles" replace />} />
        <Route path="/modeles/calculateurs" element={<CalculatorsPage />} />
        <Route path="/modeles" element={<ModelsPage leagues={leagues} loading={loading} />} />
        <Route path="/modeles/:leagueId/:tab?" element={<ModelsPage leagues={leagues} loading={loading} />} />
        <Route path="/paris/journal" element={<JournalPage bets={bets} loading={betsLoading} />} />
        <Route path="/paris/bilan" element={<BilanPage portfolio="commun" bets={bets} loading={betsLoading} />} />
        <Route path="/paris/partage" element={<PartagePage bets={bets} loading={betsLoading} />} />
        <Route path="/paris/vu-pas-pris" element={<VuPasPrisPage bets={bets} loading={betsLoading} />} />
        <Route path="/kelicful/bilan" element={<BilanPage portfolio="kelicful" bets={bets} loading={betsLoading} sportFirst />} />
        <Route path="/kelicful/atp" element={<TennisEloPage key="ATP" tour="ATP" />} />
        <Route path="/kelicful/wta" element={<TennisEloPage key="WTA" tour="WTA" />} />
        <Route path="/reglages" element={<SettingsPage bets={bets} />} />
        <Route path="*" element={<Navigate to="/modeles" replace />} />
      </Routes>
      <BetFormHost bets={bets} leagues={leagues} />
    </AppShell>
    </SessionContext.Provider>
  )
}

function Root() {
  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Maquettes de DA : uniquement en local (la direction B est retenue, la route n'est plus publiée)
  if (pathname.startsWith('/drafts') && import.meta.env.DEV) {
    return <Suspense fallback={null}><DraftsPage /></Suspense>
  }
  if (!authChecked) return null
  if (!session) return <LoginForm />
  return <AuthenticatedApp session={session} />
}

export default function App() {
  return (
    <HashRouter>
      <Root />
    </HashRouter>
  )
}
