import { useState, useEffect, lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { League } from '@/types'
import { LoginForm } from '@/components/auth/LoginForm'
import { AppShell } from '@/components/layout/AppShell'
import { useLeagues } from '@/hooks/useLeagues'
import { ModelsPage } from '@/pages/ModelsPage'
import { ComingSoon } from '@/pages/ComingSoon'
import { EloCalculator } from '@/components/league/EloCalculator'
import { JournalPage } from '@/pages/JournalPage'
import { VuPasPrisPage } from '@/pages/VuPasPrisPage'
import { BilanPage } from '@/pages/BilanPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PartagePage } from '@/pages/PartagePage'
import { BetFormHost } from '@/components/bets/BetFormHost'
import { useBets, useProfile } from '@/hooks/useBetting'
import { SessionContext } from '@/lib/session'

// Drafts de DA (données fictives) : chargés à la demande, hors du bundle principal
const DraftsPage = lazy(() => import('@/drafts/DraftsPage'))

const TITLES: Record<string, string> = {
  '/paris/journal': 'Journal', '/paris/bilan': 'Bilan commun', '/paris/partage': 'Partage & compta', '/paris/vu-pas-pris': 'Vu pas pris',
  '/kelicful/bilan': 'Bilan Kelicful', '/kelicful/atp': 'Elo Tennis ATP', '/kelicful/wta': 'Elo Tennis WTA',
  '/reglages': 'Réglages', '/modeles/calculateurs': 'Calculateurs',
}

function ModelsTitle({ leagues }: { leagues: League[] }) {
  const { leagueId } = useParams()
  const l = leagues.find(x => x.id === leagueId)
  return l ? <>Modèles <span className="text-faint">·</span> {l.name}</> : <>Modèles</>
}

// Composant monté uniquement après authentification → les hooks Supabase s'exécutent avec une session active (RLS)
function AuthenticatedApp({ session }: { session: Session }) {
  const { leagues, loading } = useLeagues()
  const { bets, loading: betsLoading } = useBets()
  const person = useProfile(session.user.id)
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? (pathname.startsWith('/modeles')
    ? <Routes><Route path="/modeles/:leagueId/*" element={<ModelsTitle leagues={leagues} />} /><Route path="*" element={<>Modèles</>} /></Routes>
    : null)

  return (
    <SessionContext.Provider value={{ userId: session.user.id, email: session.user.email, person }}>
    <AppShell leagues={leagues} email={person ?? session.user.email} title={title}>
      <Routes>
        <Route path="/" element={<Navigate to="/modeles" replace />} />
        <Route path="/modeles/calculateurs" element={<main className="px-4 py-4 md:px-6"><EloCalculator ratings={[]} defaultMode="manual" /></main>} />
        <Route path="/modeles" element={<ModelsPage leagues={leagues} loading={loading} />} />
        <Route path="/modeles/:leagueId/:tab?" element={<ModelsPage leagues={leagues} loading={loading} />} />
        <Route path="/paris/journal" element={<JournalPage bets={bets} loading={betsLoading} />} />
        <Route path="/paris/bilan" element={<BilanPage portfolio="commun" bets={bets} loading={betsLoading} />} />
        <Route path="/paris/partage" element={<PartagePage bets={bets} loading={betsLoading} />} />
        <Route path="/paris/vu-pas-pris" element={<VuPasPrisPage bets={bets} loading={betsLoading} />} />
        <Route path="/kelicful/:tab" element={<ComingSoon what="Espace Kelicful" step="7" />} />
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

  // En local, les drafts s'ouvrent sans connexion (captures) ; en ligne, connexion requise
  if (pathname.startsWith('/drafts') && (import.meta.env.DEV || session)) {
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
