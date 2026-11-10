// Formulaire « + Pari », pensé pour aller aussi vite qu'une ligne de tableur :
// seuls Position, Mise et Cote sont obligatoires ; Entrée enregistre ; le reste est déduit ou rangé sous « Plus ».
// Le pari en cours de saisie est gardé dans le navigateur (brouillon) tant qu'il n'est pas enregistré.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Bet, BetInput, BetResult, Market, Person, Portfolio } from '@/types/betting'
import { MARKETS, RESULTS } from '@/types/betting'
import { inferMarket, inferSport, resultProfit, formatEur } from '@/lib/betStats'
import { addBet, updateBet } from '@/hooks/useBetting'
import type { League } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
const DRAFT_KEY = 'bpb-bet-draft'

export interface BetFormDefaults {
  portfolio: Portfolio
  sport: string
  placedBy: Person | null
}

interface Props {
  bet?: Bet                       // modification d'un pari existant
  prefill?: Partial<BetInput>     // « Dupliquer » ou « Prendre ce pari »
  defaults: BetFormDefaults
  sports: string[]
  leagues: League[]
  teamKeys: Set<string>
  onSaved: (bet: Bet | null, values: BetInput) => void
  onClose: () => void
}

interface Draft {
  betDate: string; game: string; selection: string; sport: string; sportTouched: boolean; market: Market | ''
  stake: string; odds: string; result: BetResult; status: 'Pris' | 'Vu pas pris'; portfolio: Portfolio
  closing: string; league: string; placedBy: Person | ''; share: string; note: string
}

function loadDraft(): Draft | null {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) as Draft : null } catch { return null }
}
function saveDraft(d: Draft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY) } catch { /* stockage indisponible */ }
}

function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return <span className="mb-1 flex items-baseline justify-between text-xs text-muted">{children}{hint && <span className="text-faint">{hint}</span>}</span>
}

function Segmented<T extends string>({ value, options, onChange, labels }: { value: T | ''; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => <button key={o} type="button" data-on={value === o} onClick={() => onChange(o)} className="pill px-3 py-1.5 text-xs">{labels?.[o] ?? o}</button>)}
    </div>
  )
}

const num = (s: string) => parseFloat(s.replace(',', '.'))

function initialState(bet: Bet | undefined, prefill: Partial<BetInput> | undefined, defaults: BetFormDefaults): Draft {
  const init = { ...prefill, ...bet }
  return {
    betDate: init.bet_date ?? today(), game: init.game ?? '', selection: init.selection ?? '', sport: init.sport ?? '', sportTouched: !!init.sport,
    market: init.market ?? '', stake: init.stake != null ? String(init.stake) : '', odds: init.odds != null ? String(init.odds) : '',
    result: init.result ?? 'En cours', status: init.status ?? 'Pris', portfolio: init.portfolio ?? defaults.portfolio,
    closing: init.closing_odds != null ? String(init.closing_odds) : '', league: init.league ?? '', placedBy: init.placed_by ?? defaults.placedBy ?? '',
    share: init.share_squawo != null ? String(init.share_squawo) : '', note: init.note ?? '',
  }
}

export function BetForm({ bet, prefill, defaults, sports, leagues, teamKeys, onSaved, onClose }: Props) {
  // Nouveau pari sans préremplissage : on reprend le brouillon s'il y en a un
  const [restored] = useState(() => (!bet && !prefill?.selection ? loadDraft() : null))
  const [f, setF] = useState<Draft>(() => restored ?? initialState(bet, prefill, defaults))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF(p => ({ ...p, [k]: v }))
  const [more, setMore] = useState(!!(bet && (bet.closing_odds || bet.league || bet.note || bet.share_squawo != null || bet.status !== 'Pris' || bet.result !== 'En cours')))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Brouillon enregistré à chaque frappe (nouveaux paris uniquement)
  useEffect(() => { if (!bet) saveDraft(f.selection || f.stake || f.odds || f.game ? f : null) }, [f, bet])

  const suggestedSport = useMemo(() => (f.game || f.selection) ? inferSport(f.game, f.selection, teamKeys) : '', [f.game, f.selection, teamKeys])
  const sport = f.sportTouched ? f.sport : (suggestedSport || defaults.sport)
  const market = (f.market || (f.selection ? inferMarket(f.selection) : 'Autre')) as Market
  const s = num(f.stake), o = num(f.odds)
  const potential = s > 0 && o > 1 ? resultProfit({ stake: s, odds: o, result: 'Gagnant' }) : null
  const sportOptions = sports.includes(sport) || !sport ? sports : [...sports, sport]

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    if (!f.selection.trim()) return setError('Indiquez la position (ex. « G2 Esports -1.5 »).')
    if (!(s > 0)) return setError('La mise doit être supérieure à 0.')
    if (!(o > 1)) return setError('La cote doit être supérieure à 1.')
    const c = f.closing ? num(f.closing) : null
    if (c != null && !(c > 1)) return setError('La cote de clôture doit être supérieure à 1.')
    const sh = f.share ? num(f.share) : null
    if (sh != null && (sh < 0 || sh > 100)) return setError('La part de Squawo doit être entre 0 et 100 %.')
    const values: BetInput = {
      bet_date: f.betDate || today(), game: f.game.trim() || null, selection: f.selection.trim(), sport, stake: s, odds: o,
      result: f.result, status: f.status, portfolio: f.portfolio, closing_odds: c, clv: bet?.clv ?? null, clv_method: bet?.clv_method ?? null,
      league: f.league || null, market, placed_by: f.placedBy || null, share_squawo: sh, note: f.note.trim() || null,
    }
    setSaving(true)
    if (bet) {
      const err = await updateBet(bet.id, values, bet)
      setSaving(false)
      if (err) return setError(`Non enregistré : ${err.message}`)
      onSaved({ ...bet, ...values }, values)
    } else {
      const { bet: created, error: err } = await addBet(values, { inline: true })
      setSaving(false)
      if (err) return setError(`Non enregistré (le brouillon est conservé) : ${err.message}`)
      saveDraft(null)
      onSaved(created, values)
    }
  }

  const discard = () => { if (!bet) saveDraft(null); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center md:items-center md:p-6" style={{ background: 'rgb(5 8 15 / 0.6)' }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="flex w-full flex-col overflow-hidden bg-surface md:max-h-[92vh] md:max-w-lg md:rounded-lg md:border md:border-line">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold">{bet ? 'Modifier le pari' : 'Nouveau pari'}</h2>
          <button type="button" onClick={onClose} className="px-2 text-muted hover:text-ink" aria-label="Fermer (le brouillon est gardé)">✕</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {restored && (
            <p className="flex items-center justify-between gap-2 rounded-md border border-line bg-raised px-3 py-2 text-xs text-muted">
              Brouillon repris là où vous l'aviez laissé.
              <button type="button" onClick={() => { saveDraft(null); setF(initialState(undefined, prefill, defaults)) }} className="text-ink underline underline-offset-2">Effacer</button>
            </p>
          )}
          {bet?.source === 'import_excel' && (
            <p className="rounded-md border border-line bg-raised px-3 py-2 text-xs text-muted">Pari importé de l'Excel ({bet.source_ref}). Chaque modification est gardée dans l'historique.</p>
          )}

          <label className="block"><Label>Position</Label>
            <input autoFocus={!bet} value={f.selection} onChange={e => set('selection', e.target.value)} className="field w-full px-3 py-2.5 text-[15px]" placeholder="G2 Esports -1.5" /></label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block"><Label>Mise (€)</Label>
              <input inputMode="decimal" value={f.stake} onChange={e => set('stake', e.target.value)} className="field w-full px-3 py-2 font-mono text-xl" placeholder="0" /></label>
            <label className="block"><Label hint={potential != null ? <span className="font-mono">{formatEur(potential, { signed: true })}</span> : undefined}>Cote</Label>
              <input inputMode="decimal" value={f.odds} onChange={e => set('odds', e.target.value)} className="field w-full px-3 py-2 font-mono text-xl" placeholder="1.85" /></label>
          </div>

          <Segmented value={f.portfolio} options={['commun', 'kelicful'] as const} onChange={v => set('portfolio', v)} labels={{ commun: 'Commun', kelicful: 'Kelicful' }} />

          <label className="block"><Label hint="facultatif">Match</Label>
            <input value={f.game} onChange={e => set('game', e.target.value)} className="field w-full px-3 py-2" placeholder="G2 Esports vs Dplus KIA" /></label>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <button type="button" onClick={() => setMore(true)} className="pill px-2.5 py-1" title="Changer le sport">{sport}</button>
            <button type="button" onClick={() => setMore(true)} className="pill px-2.5 py-1" title="Changer le marché">{market}</button>
            <span>{f.betDate === today() ? "aujourd'hui" : f.betDate.split('-').reverse().join('/')}</span>
            {f.status === 'Vu pas pris' && <span className="pill px-2.5 py-1">Vu pas pris</span>}
          </div>

          <button type="button" onClick={() => setMore(m => !m)} className="text-xs text-muted hover:text-ink">{more ? '▾ Moins' : '▸ Plus : date, sport, marché, statut, résultat, clôture, ligue, placé par, part, note'}</button>
          {more && (
            <div className="space-y-4 border-l border-line pl-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><Label hint={!f.sportTouched && suggestedSport ? 'proposé' : undefined}>Sport</Label>
                  <select value={sport} onChange={e => setF(p => ({ ...p, sport: e.target.value, sportTouched: true }))} className="field w-full px-2 py-2">
                    {sportOptions.map(x => <option key={x} value={x}>{x}</option>)}
                  </select></label>
                <label className="block"><Label hint={!f.market ? 'déduit' : undefined}>Marché</Label>
                  <select value={market} onChange={e => set('market', e.target.value as Market)} className="field w-full px-2 py-2">
                    {MARKETS.map(x => <option key={x} value={x}>{x}</option>)}
                  </select></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><Label>Date</Label>
                  <input type="date" value={f.betDate} onChange={e => set('betDate', e.target.value)} className="field w-full px-2 py-2 font-mono text-sm" /></label>
                <label className="block"><Label>Résultat</Label>
                  <select value={f.result} onChange={e => set('result', e.target.value as BetResult)} className="field w-full px-2 py-2">
                    {RESULTS.map(x => <option key={x} value={x}>{x}</option>)}
                  </select></label>
              </div>
              <div><Label>Statut</Label><Segmented value={f.status} options={['Pris', 'Vu pas pris'] as const} onChange={v => set('status', v)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><Label>Cote de clôture</Label>
                  <input inputMode="decimal" value={f.closing} onChange={e => set('closing', e.target.value)} className="field w-full px-3 py-2 font-mono" placeholder="—" /></label>
                <label className="block"><Label>Part de Squawo (%)</Label>
                  <input inputMode="decimal" value={f.share} onChange={e => set('share', e.target.value)} className="field w-full px-3 py-2 font-mono" placeholder="général" /></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><Label>Ligue</Label>
                  <select value={f.league} onChange={e => set('league', e.target.value)} className="field w-full px-2 py-2">
                    <option value="">—</option>
                    {leagues.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    {f.league && !leagues.some(l => l.name === f.league) && <option value={f.league}>{f.league}</option>}
                  </select></label>
                <div><Label>Placé par</Label><Segmented value={f.placedBy} options={['Squawo', 'Kelicful'] as const} onChange={v => set('placedBy', v === f.placedBy ? '' : v)} /></div>
              </div>
              <label className="block"><Label>Note</Label>
                <textarea value={f.note} onChange={e => set('note', e.target.value)} rows={2} className="field w-full px-3 py-2 text-sm" /></label>
            </div>
          )}
          {error && <p className="text-sm text-loss" role="alert">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-line px-4 py-3">
          <button type="button" onClick={discard} className="btn-ghost px-4 py-2.5 text-sm">{bet ? 'Annuler' : 'Abandonner'}</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}
