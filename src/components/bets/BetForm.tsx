// Formulaire « + Pari », pensé pour aller aussi vite qu'une ligne de tableur :
// seuls Position, Mise et Cote sont obligatoires ; Entrée enregistre ; le reste est visible sur la même page, en retrait (petit, gris, au clic).
// Le pari en cours de saisie est gardé dans le navigateur (brouillon) tant qu'il n'est pas enregistré.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Bet, BetInput, BetResult, Market, Person, Portfolio } from '@/types/betting'
import { MARKETS, RESULTS } from '@/types/betting'
import { inferMarket, inferSport, resultProfit, formatEur } from '@/lib/betStats'
import { addBet, updateBet, deleteBet } from '@/hooks/useBetting'
import type { League } from '@/types'
import { todayLocal, addDaysLocal } from '@/lib/date'

const today = todayLocal
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
  closing: string; league: string; placedBy: Person | ''; placedByTouched: boolean; share: string; note: string
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

// Facultatif : petites pilules, champs soulignés, libellés gris
const PILL_SM = 'pill px-2 py-1 text-[11px]'
const LINE = 'w-full border-0 border-b border-line bg-transparent px-0 py-1 text-[13px] text-ink placeholder:text-faint'
const ddmm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`

function Pills<T extends string>({ value, options, onChange, labels }: { value: T | ''; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => <button key={o} type="button" data-on={value === o} onClick={() => onChange(o)} className={PILL_SM}>{labels?.[o] ?? o}</button>)}
    </div>
  )
}
function Row({ k, hint, children }: { k: string; hint?: string; children: ReactNode }) {
  return (
    <>
      <span className="pt-1 text-[11px] leading-tight text-faint">{k}{hint && <span className="block text-[10px] italic">{hint}</span>}</span>
      <div className="min-w-0">{children}</div>
    </>
  )
}

const num = (s: string) => parseFloat(s.replace(',', '.'))

function initialState(bet: Bet | undefined, prefill: Partial<BetInput> | undefined, defaults: BetFormDefaults): Draft {
  const init = { ...prefill, ...bet }
  return {
    betDate: init.bet_date ?? today(), game: init.game ?? '', selection: init.selection ?? '', sport: init.sport ?? '', sportTouched: !!init.sport,
    market: init.market ?? '', stake: init.stake != null ? String(init.stake) : '', odds: init.odds != null ? String(init.odds) : '',
    result: init.result ?? 'En cours', status: init.status ?? 'Pris', portfolio: init.portfolio ?? defaults.portfolio,
    closing: init.closing_odds != null ? String(init.closing_odds) : '', league: init.league ?? '', placedBy: init.placed_by ?? '', placedByTouched: init.placed_by != null,
    share: init.share_squawo != null ? String(init.share_squawo) : '', note: init.note ?? '',
  }
}

export function BetForm({ bet, prefill, defaults, sports, leagues, teamKeys, onSaved, onClose }: Props) {
  // Nouveau pari sans préremplissage : on reprend le brouillon s'il y en a un
  const [restored] = useState(() => (!bet && !prefill?.selection ? loadDraft() : null))
  const [f, setF] = useState<Draft>(() => restored ?? initialState(bet, prefill, defaults))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF(p => ({ ...p, [k]: v }))
  const dateRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Brouillon enregistré à chaque frappe (nouveaux paris uniquement)
  useEffect(() => { if (!bet) saveDraft(f.selection || f.stake || f.odds || f.game ? f : null) }, [f, bet])

  const suggestedSport = useMemo(() => (f.game || f.selection) ? inferSport(f.game, f.selection, teamKeys) : '', [f.game, f.selection, teamKeys])
  const sport = f.sportTouched ? f.sport : (suggestedSport || defaults.sport)
  const market = (f.market || (f.selection ? inferMarket(f.selection) : 'Autre')) as Market
  const s = num(f.stake), o = num(f.odds)
  const potential = s > 0 && o > 1 ? resultProfit({ stake: s, odds: o, result: 'Gagnant' }) : null
  const sportOptions = sports.includes(sport) || !sport ? sports : [...sports, sport]
  // Placé par : celui qui a misé. Par défaut Kelicful pour son portefeuille, la personne connectée pour le commun
  const placedBy: Person | '' = f.placedByTouched ? f.placedBy : (f.portfolio === 'kelicful' ? 'Kelicful' : (defaults.placedBy ?? ''))
  const quickDates = [0, 1, 2, 3, 4].map(n => addDaysLocal(today(), n))
  const forOther = f.portfolio === 'kelicful' && placedBy === 'Squawo'

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
      league: f.league || null, market, placed_by: placedBy || null, share_squawo: sh, note: f.note.trim() || null,
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

          {/* Facultatif : tout visible, en retrait */}
          <div className="border-t border-dashed border-line pt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.06em] text-faint">Facultatif</div>
            <div className="grid grid-cols-[78px_1fr] items-start gap-x-3 gap-y-2.5">
              <Row k="Match"><input value={f.game} onChange={e => set('game', e.target.value)} className={LINE} placeholder="G2 Esports vs Dplus KIA" /></Row>
              <Row k="Date">
                <div className="flex flex-wrap gap-1">
                  {quickDates.map(d => (
                    <button key={d} type="button" data-on={f.betDate === d} onClick={() => set('betDate', d)} className={`${PILL_SM} font-mono`} title={d.split('-').reverse().join('/')}>{ddmm(d)}</button>
                  ))}
                  <span className="relative">
                    <button type="button" data-on={!quickDates.includes(f.betDate)} className={`${PILL_SM} font-mono`}
                      onClick={() => { const el = dateRef.current; if (!el) return; try { el.showPicker() } catch { el.focus() } }}>
                      {quickDates.includes(f.betDate) ? 'Autre…' : ddmm(f.betDate)}
                    </button>
                    <input ref={dateRef} type="date" value={f.betDate} onChange={e => e.target.value && set('betDate', e.target.value)}
                      tabIndex={-1} aria-label="Autre date" className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0" />
                  </span>
                </div>
              </Row>
              <Row k="Sport" hint={!f.sportTouched && suggestedSport ? 'proposé' : undefined}>
                <Pills value={sport} options={sportOptions} onChange={v => setF(p => ({ ...p, sport: v, sportTouched: true }))} />
              </Row>
              <Row k="Marché" hint={!f.market ? 'déduit' : undefined}><Pills value={market} options={MARKETS} onChange={v => set('market', v)} /></Row>
              <Row k="Résultat"><Pills value={f.result} options={RESULTS} onChange={v => set('result', v)} labels={{ '1/2 Gagnant': '½ Gagnant', '1/2 Perdant': '½ Perdant' }} /></Row>
              <Row k="Statut"><Pills value={f.status} options={['Pris', 'Vu pas pris'] as const} onChange={v => set('status', v)} /></Row>
              <Row k="Placé par"><Pills value={placedBy} options={['Squawo', 'Kelicful'] as const} onChange={v => setF(p => ({ ...p, placedBy: v, placedByTouched: true }))} /></Row>
              <Row k="Clôture · part">
                <div className="grid grid-cols-2 gap-3">
                  <input inputMode="decimal" value={f.closing} onChange={e => set('closing', e.target.value)} className={`${LINE} font-mono`} placeholder="clôture" aria-label="Cote de clôture" />
                  <input inputMode="decimal" value={f.share} onChange={e => set('share', e.target.value)} className={`${LINE} font-mono`} placeholder="part Squawo (%)" aria-label="Part de Squawo (%)" />
                </div>
              </Row>
              <Row k="Ligue · note">
                <div className="grid grid-cols-2 gap-3">
                  <select value={f.league} onChange={e => set('league', e.target.value)} className={LINE} aria-label="Ligue">
                    <option value="">—</option>
                    {leagues.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    {f.league && !leagues.some(l => l.name === f.league) && <option value={f.league}>{f.league}</option>}
                  </select>
                  <input value={f.note} onChange={e => set('note', e.target.value)} className={LINE} placeholder="note" aria-label="Note" />
                </div>
              </Row>
            </div>
          </div>
          {forOther && <p className="rounded-md border border-line bg-raised px-3 py-2 text-xs text-muted">Placé par Squawo pour le portefeuille de Kelicful : ce pari comptera dans la compta entre vous.</p>}
          {error && <p className="text-sm text-loss" role="alert">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-line px-4 py-3">
          {bet && (confirmDelete ? (
            <button type="button" onClick={async () => { if (!(await deleteBet(bet.id))) onClose() }} className="rounded-md bg-danger px-3 py-2.5 text-sm font-semibold text-ink">Confirmer</button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost px-3 py-2.5 text-sm text-loss" title="Restaurable depuis Réglages → Paris supprimés">Supprimer</button>
          ))}
          <button type="button" onClick={discard} className="btn-ghost px-4 py-2.5 text-sm">{bet ? 'Annuler' : 'Abandonner'}</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}
