// Saisie express façon tableur : Position · Mise · Cote · portefeuille, Entrée pour ajouter.
// Date du jour, sport et marché déduits, « En cours », placé par la personne connectée.
import { useRef, useState, type FormEvent } from 'react'
import type { Portfolio } from '@/types/betting'
import { addBet, useUserPrefs } from '@/hooks/useBetting'
import { useTeamKeys } from '@/hooks/useTeamKeys'
import { useSession } from '@/lib/session'
import { inferMarket, inferSport } from '@/lib/betStats'

const num = (s: string) => parseFloat(s.replace(',', '.'))

export function QuickAdd() {
  const { userId, person } = useSession()
  const { prefs, save } = useUserPrefs(userId)
  const teamKeys = useTeamKeys()
  const [selection, setSelection] = useState('')
  const [stake, setStake] = useState('')
  const [odds, setOdds] = useState('')
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const first = useRef<HTMLInputElement>(null)
  const pf = portfolio ?? prefs?.last_portfolio ?? 'commun'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const s = num(stake), o = num(odds)
    if (!selection.trim()) return setError('Position ?')
    if (!(s > 0)) return setError('Mise > 0')
    if (!(o > 1)) return setError('Cote > 1')
    setBusy(true)
    const sport = inferSport('', selection, teamKeys)
    const { error: err } = await addBet({
      bet_date: new Date().toISOString().slice(0, 10), game: null, selection: selection.trim(), sport, stake: s, odds: o,
      result: 'En cours', status: 'Pris', portfolio: pf, closing_odds: null, clv: null, clv_method: null, league: null,
      market: inferMarket(selection), placed_by: person, share_squawo: null, note: null,
    }, { inline: true })
    setBusy(false)
    if (err) return setError(`Non enregistré : ${err.message}`)
    save({ last_portfolio: pf, last_sport: sport })
    setSelection(''); setStake(''); setOdds('')
    first.current?.focus()
  }

  return (
    <form onSubmit={submit} className="panel flex flex-wrap items-center gap-2 px-3 py-2.5">
      <span className="text-xs font-semibold text-muted">Saisie rapide</span>
      <input ref={first} value={selection} onChange={e => setSelection(e.target.value)} placeholder="Position (ex. G2 Esports -1.5)" className="field min-w-0 flex-[3_1_220px] px-3 py-2 text-sm" aria-label="Position" />
      <input value={stake} onChange={e => setStake(e.target.value)} inputMode="decimal" placeholder="Mise" className="field w-20 flex-1 px-2 py-2 font-mono text-sm sm:flex-none" aria-label="Mise" />
      <input value={odds} onChange={e => setOdds(e.target.value)} inputMode="decimal" placeholder="Cote" className="field w-20 flex-1 px-2 py-2 font-mono text-sm sm:flex-none" aria-label="Cote" />
      <div className="flex gap-1">
        {(['commun', 'kelicful'] as const).map(p => (
          <button key={p} type="button" data-on={pf === p} onClick={() => setPortfolio(p)} className="pill px-2.5 py-2 text-xs">{p === 'commun' ? 'Commun' : 'Kelicful'}</button>
        ))}
      </div>
      <button type="submit" disabled={busy} className="btn-primary px-3 py-2 text-sm disabled:opacity-50">{busy ? '…' : 'Ajouter ↵'}</button>
      {error && <span className="w-full text-xs text-loss">{error}</span>}
    </form>
  )
}
