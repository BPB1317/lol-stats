// Ouvre le formulaire de pari depuis l'URL : ?pari=nouveau (avec préremplissage facultatif) ou ?pari=<id>.
// Après un ajout : « Dupliquer » rouvre le formulaire avec les mêmes valeurs (ex. +1,5 pris à côté du sec).
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Bet, BetInput } from '@/types/betting'
import type { League } from '@/types'
import { BetForm } from './BetForm'
import { useSession } from '@/lib/session'
import { useSettings, useUserPrefs } from '@/hooks/useBetting'
import { useTeamKeys } from '@/hooks/useTeamKeys'
import { formatEur } from '@/lib/betStats'

const PREFILL_KEYS = ['game', 'selection', 'odds', 'league', 'sport'] as const

export function BetFormHost({ bets, leagues }: { bets: Bet[]; leagues: League[] }) {
  const [params, setParams] = useSearchParams()
  const { userId, person } = useSession()
  const { settings } = useSettings()
  const { prefs, save: savePrefs } = useUserPrefs(userId)
  const teamKeys = useTeamKeys()
  const [saved, setSaved] = useState<BetInput | null>(null)
  const [dup, setDup] = useState<BetInput | null>(null)
  const [formKey, setFormKey] = useState(0)

  const target = params.get('pari')
  if (!target) return null

  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('pari'); PREFILL_KEYS.forEach(k => next.delete(k))
    setParams(next, { replace: true })
    setSaved(null); setDup(null)
  }

  const editing = target !== 'nouveau' ? bets.find(b => b.id === target) : undefined
  if (target !== 'nouveau' && !editing) return null // pari pas encore chargé

  const fromUrl: Partial<BetInput> = {}
  for (const k of PREFILL_KEYS) {
    const v = params.get(k)
    if (v) (fromUrl as Record<string, unknown>)[k] = k === 'odds' ? parseFloat(v) : v
  }

  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" style={{ background: 'rgb(5 8 15 / 0.75)' }} onMouseDown={e => e.target === e.currentTarget && close()}>
        <div className="panel w-full max-w-md space-y-3 p-4">
          <div className="text-sm font-semibold">Pari enregistré</div>
          <div className="text-sm"><span className="font-medium">{saved.selection}</span> {saved.game && <span className="text-muted">— {saved.game}</span>}</div>
          <div className="font-mono text-sm text-muted">{formatEur(saved.stake)} à {saved.odds.toFixed(2)} · {saved.portfolio === 'commun' ? 'Commun' : 'Kelicful'}</div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setDup(saved); setSaved(null); setFormKey(k => k + 1) }} className="btn-ghost flex-1 py-2.5 text-sm">Dupliquer</button>
            <button onClick={() => { setDup(null); setSaved(null); setFormKey(k => k + 1) }} className="btn-ghost flex-1 py-2.5 text-sm">Nouveau</button>
            <button onClick={close} className="btn-primary flex-1 py-2.5 text-sm">Fermer</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BetForm
      key={`${target}-${formKey}`}
      bet={editing}
      prefill={dup ? { ...dup, result: 'En cours', closing_odds: null, market: null } : fromUrl}
      // Portefeuille toujours Commun par défaut ; Kelicful se choisit d'un clic
      defaults={{ portfolio: 'commun', sport: prefs?.last_sport ?? 'E-sport', placedBy: person }}
      sports={settings.sports}
      leagues={leagues}
      teamKeys={teamKeys}
      onClose={close}
      onSaved={(_bet, values) => {
        savePrefs({ last_sport: values.sport, last_portfolio: values.portfolio })
        if (editing) close()
        else setSaved(values)
      }}
    />
  )
}
