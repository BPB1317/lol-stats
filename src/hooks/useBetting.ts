// Hooks du côté parieur : lecture + temps réel, et fonctions d'écriture.
import { useEffect, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clvRatio, inferMarket } from '@/lib/betStats'
import type { AppSettings, Bet, BetInput, BetResult, ComptaLegacy, MoneyMove, Person, TennisElo, UserPrefs } from '@/types/betting'
import { DEFAULT_SPORTS } from '@/types/betting'
import { notify } from '@/lib/toast'

// Toute écriture qui échoue est signalée, avec possibilité de réessayer : rien ne se perd en silence
function report<T extends { message: string } | null>(error: T, retry: () => unknown, okText?: string): T {
  if (error) notify('error', `Non enregistré : ${error.message}`, () => { retry() })
  else if (okText) notify('ok', okText)
  return error
}

const PAGE = 1000

// Un nom de canal unique par abonnement : plusieurs écrans peuvent écouter la même table
let channelSeq = 0
const channelName = (base: string) => `${base}-${++channelSeq}`

// Supabase plafonne une requête à 1 000 lignes : on pagine (le journal dépasse ce volume)
async function fetchAll<T>(table: string, order: string, eq?: [column: string, value: string]): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select('*')
    if (eq) q = q.eq(eq[0], eq[1])
    const { data, error } = await q.order(order, { ascending: true }).order('id').range(from, from + PAGE - 1)
    if (error || !data) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
  }
  return out
}

// Rafraîchissement local après chaque écriture faite depuis ce navigateur : l'écran se met à jour tout de suite,
// sans dépendre du temps réel (qui reste là pour voir les saisies de l'autre). Un pari ajouté / modifié apparaît
// immédiatement (mise à jour optimiste), puis la table est relue pour se caler sur la base.
type LocalChange = { table: string; upsert?: { id: string }; remove?: string }
const bus = new EventTarget()
function changed(c: LocalChange) { bus.dispatchEvent(new CustomEvent('change', { detail: c })) }

function useRealtimeTable<T extends { id: string }>(table: string, order: string) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const data = await fetchAll<T>(table, order)
      if (alive) { setRows(data); setLoading(false) }
    }
    load()
    const channel = supabase.channel(channelName(`rt-${table}`))
      .on('postgres_changes', { event: '*', schema: 'public', table }, load)
      .subscribe()
    const onLocal = (e: Event) => {
      const c = (e as CustomEvent<LocalChange>).detail
      if (c.table !== table) return
      if (c.upsert) {
        const row = c.upsert as unknown as T
        setRows(rs => rs.some(r => r.id === row.id) ? rs.map(r => (r.id === row.id ? { ...r, ...row } : r)) : [...rs, row])
      }
      if (c.remove) setRows(rs => rs.filter(r => r.id !== c.remove))
      load()
    }
    bus.addEventListener('change', onLocal)
    // Filet de sécurité si un message temps réel se perd : relecture quand on revient sur l'onglet
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; supabase.removeChannel(channel); bus.removeEventListener('change', onLocal); document.removeEventListener('visibilitychange', onVisible) }
  }, [table, order])
  return { rows, loading }
}

// ── Paris ──────────────────────────────────────────────────────────

export function useBets() {
  const { rows, loading } = useRealtimeTable<Bet>('bets', 'bet_date')
  return { bets: rows, loading }
}

/** Complète un pari saisi : marché déduit si absent, CLV calculé (méthode ratio) dès qu'une clôture est saisie. */
export function prepareBet<T extends Partial<BetInput>>(b: T): T {
  const out = { ...b }
  if (!out.market && out.selection) out.market = inferMarket(out.selection)
  if (out.closing_odds != null && out.odds != null && out.clv_method !== 'legacy_margin5') {
    out.clv = clvRatio(Number(out.odds), Number(out.closing_odds))
    out.clv_method = out.clv == null ? null : 'ratio'
  }
  return out
}

/** `inline` : l'appelant affiche lui-même l'erreur (le formulaire garde le brouillon) — pas de « Réessayer » en double. */
export async function addBet(b: BetInput, opts: { inline?: boolean } = {}): Promise<{ bet: Bet | null; error: PostgrestError | null }> {
  const { data, error } = await supabase.from('bets').insert(prepareBet({ ...b, source: 'app' })).select().single()
  if (!error && data) changed({ table: 'bets', upsert: data as Bet })
  if (opts.inline) { if (!error) notify('ok', 'Pari enregistré') }
  else report(error, () => addBet(b), 'Pari enregistré')
  return { bet: data as Bet | null, error }
}

export async function updateBet(id: string, patch: Partial<BetInput>, current?: Bet): Promise<PostgrestError | null> {
  const merged = current ? prepareBet({ ...current, ...patch }) : prepareBet(patch)
  const keys = new Set([...Object.keys(patch), 'clv', 'clv_method', 'market'])
  const changes = Object.fromEntries(Object.entries(merged).filter(([k]) => keys.has(k)))
  const { error } = await supabase.from('bets').update(changes).eq('id', id)
  if (!error) changed({ table: 'bets', upsert: { id, ...changes } })
  return report(error, () => updateBet(id, patch, current), 'Enregistré')
}

export async function setBetResult(bet: Bet, result: BetResult, closingOdds?: number | null): Promise<PostgrestError | null> {
  return updateBet(bet.id, closingOdds === undefined ? { result } : { result, closing_odds: closingOdds }, bet)
}

/** Paris supprimés récemment, lus dans l'historique (version complète au moment de la suppression). */
export async function fetchDeletedBets(limit = 50) {
  const { data, error } = await supabase.from('data_history').select('id,old_row,changed_at')
    .eq('table_name', 'bets').eq('action', 'DELETE').order('changed_at', { ascending: false }).limit(limit)
  return { rows: (data ?? []) as { id: number; old_row: Bet; changed_at: string }[], error }
}

/** Remet un pari supprimé tel qu'il était (même identifiant). */
export async function restoreBet(old: Bet): Promise<PostgrestError | null> {
  const { error } = await supabase.from('bets').insert(old)
  if (!error) changed({ table: 'bets', upsert: old })
  return report(error, () => restoreBet(old), 'Pari restauré')
}

export async function deleteBet(id: string): Promise<PostgrestError | null> {
  const { error } = await supabase.from('bets').delete().eq('id', id)
  if (!error) changed({ table: 'bets', remove: id })
  return report(error, () => deleteBet(id), 'Pari supprimé (restaurable dans Réglages → Paris supprimés)')
}

// ── Mouvements d'argent ───────────────────────────────────────────

export function useMoneyMoves() {
  const { rows, loading } = useRealtimeTable<MoneyMove>('money_moves', 'move_date')
  return { moves: rows, loading }
}

export async function addMoneyMove(m: Omit<MoneyMove, 'id' | 'created_at' | 'source' | 'source_ref'>): Promise<PostgrestError | null> {
  const { error } = await supabase.from('money_moves').insert({ ...m, source: 'app' })
  if (!error) changed({ table: 'money_moves' })
  return report(error, () => addMoneyMove(m), 'Mouvement enregistré')
}

export async function deleteMoneyMove(id: string): Promise<PostgrestError | null> {
  const { error } = await supabase.from('money_moves').delete().eq('id', id)
  if (!error) changed({ table: 'money_moves', remove: id })
  return report(error, () => deleteMoneyMove(id), 'Mouvement supprimé')
}

export function useComptaLegacy() {
  const { rows, loading } = useRealtimeTable<ComptaLegacy>('compta_legacy', 'date')
  return { rows, loading }
}

// ── Réglages et préférences ───────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  default_share_squawo: 50, bankroll: 5000, stake_exponent: -0.7, reset_date_commun: null, reset_date_kelicful: null,
  tennis_elo_weight_overall: 0.4, tennis_elo_weight_surface: 0.6, series_concentration: 40, tennis_w_dur: 0.4, tennis_w_terre: 0.4, tennis_w_gazon: 0.4, sports: DEFAULT_SPORTS,
  compta_legacy_balance: 1584.48,
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', true).maybeSingle()
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' && k !== 'reset_date_commun' && k !== 'reset_date_kelicful' ? Number(v) : v])) } as AppSettings)
      setLoading(false)
    }
    load()
    const channel = supabase.channel(channelName('rt-app_settings')).on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, load).subscribe()
    const onLocal = (e: Event) => { if ((e as CustomEvent<LocalChange>).detail.table === 'app_settings') load() }
    bus.addEventListener('change', onLocal)
    return () => { supabase.removeChannel(channel); bus.removeEventListener('change', onLocal) }
  }, [])
  return { settings, loading }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<PostgrestError | null> {
  const { error } = await supabase.from('app_settings').update(patch).eq('id', true)
  if (!error) changed({ table: 'app_settings' })
  return report(error, () => updateSettings(patch), 'Réglages enregistrés')
}

export function useUserPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null)
  useEffect(() => {
    if (!userId) return
    supabase.from('user_prefs').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      setPrefs((data as UserPrefs | null) ?? { user_id: userId, hidden_seasons: [], last_sport: null, last_portfolio: null })
    })
  }, [userId])
  const save = async (patch: Partial<UserPrefs>) => {
    if (!userId) return
    setPrefs(p => (p ? { ...p, ...patch } : p))
    await supabase.from('user_prefs').upsert({ user_id: userId, ...patch })
  }
  return { prefs, save }
}

/** Parieur associé au compte connecté (table profiles). */
export function useProfile(userId: string | undefined) {
  const [person, setPerson] = useState<Person | null>(null)
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('person').eq('user_id', userId).maybeSingle().then(({ data }) => setPerson((data?.person as Person) ?? null))
  }, [userId])
  return person
}

// ── Elo tennis ────────────────────────────────────────────────────

export function useTennisElo(tour: 'ATP' | 'WTA') {
  const [players, setPlayers] = useState<TennisElo[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const data = await fetchAll<TennisElo>('tennis_elo', 'player', ['tour', tour])
      if (alive) { setPlayers(data); setLoading(false) }
    }
    load()
    const channel = supabase.channel(channelName(`rt-tennis-${tour}`)).on('postgres_changes', { event: '*', schema: 'public', table: 'tennis_elo' }, load).subscribe()
    const onLocal = (e: Event) => { if ((e as CustomEvent<LocalChange>).detail.table === 'tennis_elo') load() }
    bus.addEventListener('change', onLocal)
    return () => { alive = false; supabase.removeChannel(channel); bus.removeEventListener('change', onLocal) }
  }, [tour])
  return { players, loading }
}

/** Remplace toute la liste d'un circuit (mise à jour par collage). */
export async function replaceTennisElo(tour: 'ATP' | 'WTA', rows: Omit<TennisElo, 'id' | 'tour' | 'updated_at'>[]) {
  const del = await supabase.from('tennis_elo').delete().eq('tour', tour)
  if (del.error) return del.error
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('tennis_elo').insert(rows.slice(i, i + 500).map(r => ({ ...r, tour })))
    if (error) return error
  }
  changed({ table: 'tennis_elo' })
  return null
}
