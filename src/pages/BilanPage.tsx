// Bilan d'un portefeuille : paris + ajustements, masquage selon les préférences et la date de remise à zéro
import type { Bet, Portfolio } from '@/types/betting'
import { useMoneyMoves, useSettings, useUserPrefs } from '@/hooks/useBetting'
import { useSession } from '@/lib/session'
import { BilanView } from '@/components/bilan/BilanView'

export function BilanPage({ portfolio, bets, loading, sportFirst }: { portfolio: Portfolio; bets: Bet[]; loading: boolean; sportFirst?: boolean }) {
  const { moves, loading: movesLoading } = useMoneyMoves()
  const { settings } = useSettings()
  const { userId } = useSession()
  const { prefs } = useUserPrefs(userId)
  if (loading || movesLoading) return <div className="py-16 text-center text-muted">Chargement…</div>
  const resetDate = portfolio === 'kelicful' ? settings.reset_date_kelicful : settings.reset_date_commun
  return <BilanView portfolio={portfolio} bets={bets} moves={moves} hiddenSeasons={prefs?.hidden_seasons ?? []} resetDate={resetDate} sportFirst={sportFirst} />
}
