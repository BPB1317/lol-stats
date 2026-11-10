// Calculs du côté parieur : bénéfice, bilans, CLV, partage, déductions automatiques.
// Mêmes formules que l'Excel « LoL_2026 ». Une seule source de vérité, testée (betStats.test.ts).
import type { Bet, BetResult, Market, MoneyMove, Person } from '@/types/betting'
import { SETTLED_RESULTS } from '@/types/betting'
import { teamKey } from './teamName'

type ProfitInput = Pick<Bet, 'stake' | 'odds' | 'result'>

/** Bénéfice selon le résultat, sans tenir compte du statut (sert aussi au théorique des « Vu pas pris »). */
export function resultProfit({ stake, odds, result }: ProfitInput): number {
  switch (result) {
    case 'Gagnant': return stake * (odds - 1)
    case '1/2 Gagnant': return stake * (odds + 1) / 2 - stake
    case 'Perdant': return -stake
    case '1/2 Perdant': return -0.5 * stake
    default: return 0 // Remboursé, En cours
  }
}

/** Bénéfice réel : un « Vu pas pris » ne rapporte rien. */
export function profit(b: ProfitInput & Pick<Bet, 'status'>): number {
  return b.status === 'Vu pas pris' ? 0 : resultProfit(b)
}

/** Bénéfice théorique (affiché uniquement dans l'onglet Vu pas pris). */
export const theoreticalProfit = resultProfit

export const isSettled = (r: BetResult) => SETTLED_RESULTS.includes(r)
export const isWin = (r: BetResult) => r === 'Gagnant' || r === '1/2 Gagnant'

/** CLV des nouveaux paris : cote prise ÷ cote de clôture − 1. */
export function clvRatio(odds: number, closing: number | null | undefined): number | null {
  if (!closing || closing <= 1) return null
  return odds / closing - 1
}

// ── Filtres de période ─────────────────────────────────────────────

export interface VisibilityOptions {
  hiddenSeasons?: number[]
  resetDate?: string | null
}

/** Masquage sans suppression : saisons masquées et date de remise à zéro. */
export function visible<T extends { bet_date?: string; move_date?: string }>(rows: T[], o: VisibilityOptions): T[] {
  const hidden = new Set(o.hiddenSeasons ?? [])
  return rows.filter(r => {
    const d = (r.bet_date ?? r.move_date) as string
    if (hidden.has(+d.slice(0, 4))) return false
    if (o.resetDate && d < o.resetDate) return false
    return true
  })
}

// ── Bilan ──────────────────────────────────────────────────────────

export interface Summary {
  count: number          // paris réglés (Gagnant, Perdant, ½G, ½P)
  refunded: number
  pending: number
  staked: number         // misé sur les paris réglés
  betProfit: number      // bénéfice des paris seuls
  adjustments: number    // ajustements du portefeuille (comptent dans bénéfice et ROI)
  profit: number         // betProfit + adjustments
  roi: number | null
  wins: number
  hitRate: number | null
  avgStake: number | null
  avgOdds: number | null
  clvAvg: number | null
  clvPositiveShare: number | null
  clvCount: number
  clvMixed: boolean      // la période mélange les méthodes ratio et legacy_margin5
}

/** Bilan des paris pris (« Vu pas pris » exclus) + ajustements. Les retraits/dépôts n'y entrent jamais. */
export function summarize(bets: Bet[], moves: MoneyMove[] = []): Summary {
  const taken = bets.filter(b => b.status === 'Pris')
  const settled = taken.filter(b => isSettled(b.result))
  const staked = settled.reduce((s, b) => s + Number(b.stake), 0)
  const betProfit = settled.reduce((s, b) => s + resultProfit(b), 0)
  const adjustments = moves.filter(m => m.kind === 'Ajustement').reduce((s, m) => s + Number(m.amount), 0)
  const total = betProfit + adjustments
  const wins = settled.filter(b => isWin(b.result)).length
  const withClv = settled.filter(b => b.clv != null)
  const methods = new Set(withClv.map(b => b.clv_method ?? 'ratio'))
  return {
    count: settled.length,
    refunded: taken.filter(b => b.result === 'Remboursé').length,
    pending: taken.filter(b => b.result === 'En cours').length,
    staked,
    betProfit,
    adjustments,
    profit: total,
    roi: staked > 0 ? total / staked : null,
    wins,
    hitRate: settled.length ? wins / settled.length : null,
    avgStake: settled.length ? staked / settled.length : null,
    avgOdds: settled.length ? settled.reduce((s, b) => s + Number(b.odds), 0) / settled.length : null,
    clvAvg: withClv.length ? withClv.reduce((s, b) => s + Number(b.clv), 0) / withClv.length : null,
    clvPositiveShare: withClv.length ? withClv.filter(b => Number(b.clv) > 0).length / withClv.length : null,
    clvCount: withClv.length,
    clvMixed: methods.size > 1,
  }
}

/** Bilan théorique des « Vu pas pris » : à mise réelle ou à mise fixe. */
export function theoreticalSummary(bets: Bet[], fixedStake?: number) {
  const seen = bets.filter(b => b.status === 'Vu pas pris' && isSettled(b.result))
  const rows = seen.map(b => ({ ...b, stake: fixedStake ?? Number(b.stake) }))
  const staked = rows.reduce((s, b) => s + b.stake, 0)
  const pl = rows.reduce((s, b) => s + resultProfit(b), 0)
  return { count: seen.length, staked, profit: pl, roi: staked > 0 ? pl / staked : null }
}

/** Regroupe les paris (et ajustements) par clé, avec un bilan par groupe. */
export function groupSummaries(bets: Bet[], moves: MoneyMove[], key: (d: string, b?: Bet) => string) {
  const groups = new Map<string, { bets: Bet[]; moves: MoneyMove[] }>()
  for (const b of bets) {
    const k = key(b.bet_date, b)
    const g = groups.get(k) ?? { bets: [], moves: [] }
    g.bets.push(b); groups.set(k, g)
  }
  for (const m of moves) {
    const k = key(m.move_date)
    const g = groups.get(k) ?? { bets: [], moves: [] }
    g.moves.push(m); groups.set(k, g)
  }
  return [...groups.entries()].map(([k, g]) => ({ key: k, ...summarize(g.bets, g.moves) })).sort((a, b) => a.key.localeCompare(b.key))
}

/** Bénéfice cumulé, un point par date (paris réglés + ajustements). */
export function cumulative(bets: Bet[], moves: MoneyMove[] = []) {
  const events: { date: string; v: number }[] = [
    ...bets.filter(b => b.status === 'Pris' && isSettled(b.result)).map(b => ({ date: b.bet_date, v: resultProfit(b) })),
    ...moves.filter(m => m.kind === 'Ajustement').map(m => ({ date: m.move_date, v: Number(m.amount) })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const out: { date: string; value: number }[] = []
  let acc = 0
  for (const e of events) {
    acc += e.v
    if (out.length && out[out.length - 1].date === e.date) out[out.length - 1].value = acc
    else out.push({ date: e.date, value: acc })
  }
  return out
}

// ── Partage & compta ───────────────────────────────────────────────

/** Part de Squawo (0–1) d'un pari : % du pari s'il est rempli, sinon % général. */
export function squawoShare(b: Pick<Bet, 'share_squawo'>, defaultShare: number): number {
  return (b.share_squawo ?? defaultShare) / 100
}

/** Bénéfice commun attribué à chacun, moins les retraits déjà faits. */
export function whoHasWhat(bets: Bet[], moves: MoneyMove[], defaultShare: number) {
  const settled = bets.filter(b => b.status === 'Pris' && b.portfolio === 'commun' && isSettled(b.result))
  let squawo = 0, kelicful = 0
  for (const b of settled) {
    const p = resultProfit(b), s = squawoShare(b, defaultShare)
    squawo += p * s; kelicful += p * (1 - s)
  }
  // Ajustements : partagés selon le % général
  for (const m of moves.filter(m => m.portfolio === 'commun' && m.kind === 'Ajustement')) {
    squawo += Number(m.amount) * defaultShare / 100
    kelicful += Number(m.amount) * (1 - defaultShare / 100)
  }
  const withdrawn = (p: Person) => moves.filter(m => m.portfolio === 'commun' && m.kind === 'Retrait')
    .reduce((s, m) => s + (m.person === p ? Number(m.amount) : m.person === 'Les deux' ? Number(m.amount) / 2 : 0), 0)
  const deposited = (p: Person) => moves.filter(m => m.portfolio === 'commun' && m.kind === 'Dépôt')
    .reduce((s, m) => s + (m.person === p ? Number(m.amount) : m.person === 'Les deux' ? Number(m.amount) / 2 : 0), 0)
  return {
    squawo: { earned: squawo, withdrawn: withdrawn('Squawo'), deposited: deposited('Squawo'), remaining: squawo - withdrawn('Squawo') + deposited('Squawo') },
    kelicful: { earned: kelicful, withdrawn: withdrawn('Kelicful'), deposited: deposited('Kelicful'), remaining: kelicful - withdrawn('Kelicful') + deposited('Kelicful') },
  }
}

/** Bénéficiaire d'un pari pour la compta entre nous : portefeuille perso, sinon personne. */
export function beneficiary(b: Pick<Bet, 'portfolio'>): Person | null {
  return b.portfolio === 'kelicful' ? 'Kelicful' : b.portfolio === 'squawo' ? 'Squawo' : null
}

/**
 * Solde entre nous, positif = Kelicful doit à Squawo (même logique que l'onglet « Compta Kévin »).
 * Un règlement (mouvement « Règlement », person = celui qui paie) réduit la dette de celui qui paie.
 * Un pari placé par l'un pour le portefeuille perso de l'autre : celui qui a placé a avancé la mise et touché le retour.
 * Le bénéficiaire lui doit donc le bénéfice (négatif si perte : c'est le placeur qui doit).
 */
export function interPersonBalance(bets: Bet[], legacyBalance: number, moves: MoneyMove[] = []) {
  const concerned = bets.filter(b => b.status === 'Pris' && b.placed_by && beneficiary(b) && b.placed_by !== beneficiary(b) && isSettled(b.result))
  let balance = legacyBalance
  for (const b of concerned) {
    const p = resultProfit(b)
    // Le placeur détient le résultat ; il le doit au bénéficiaire
    balance += b.placed_by === 'Kelicful' ? p : -p
  }
  const settlements = moves.filter(m => m.kind === 'Règlement')
  for (const m of settlements) balance += m.person === 'Kelicful' ? -Number(m.amount) : Number(m.amount)
  return { balance, concerned, settlements }
}

// ── Déductions automatiques à la saisie ────────────────────────────

/** Marché déduit de la position (modifiable par l'utilisateur). */
export function inferMarket(selection: string): Market {
  const s = selection.toLowerCase()
  if (/\bcombin[ée]|\s\+\s|\s&\s|\bx\s?\d+$/.test(s)) return 'Combiné'  // « Favo LFL x 5 » = combiné de 5
  if (/\b(points?|rebonds?|passes?|assists?|kills?|aces?|tirs?)\b/.test(s) && /\d/.test(s)) return 'Stats joueur'
  if (/\b(over|under|plus de|moins de)\b/.test(s)) return 'Over/Under'
  if (/(^|\s)[+\-−]\s?\d+([.,]\d+)?\b|\b(ah|hdp|handicap)\b|(^|\s)0([.,]0)?$/.test(s)) return 'Handicap'
  return s.trim() ? 'Vainqueur' : 'Autre'
}

const F1_DRIVERS = ['verstappen', 'hamilton', 'leclerc', 'norris', 'piastri', 'russell', 'alonso', 'sainz', 'perez', 'pérez', 'antonelli', 'gasly', 'ocon', 'albon', 'stroll', 'hulkenberg', 'hülkenberg', 'tsunoda', 'lawson', 'hadjar', 'bearman', 'bortoleto', 'colapinto']
const NBA = ['heat', 'bulls', 'cavaliers', 'cavs', 'knicks', 'spurs', 'lakers', 'celtics', '76ers', 'sixers', 'warriors', 'nets', 'bucks', 'suns', 'nuggets', 'mavericks', 'mavs', 'clippers', 'rockets', 'thunder', 'timberwolves', 'pelicans', 'grizzlies', 'kings', 'jazz', 'blazers', 'pistons', 'pacers', 'hawks', 'hornets', 'magic', 'wizards', 'raptors']

/** Sport proposé pendant la saisie, règles dans l'ordre du cahier des charges. */
export function inferSport(game: string, selection: string, teamKeys: Set<string>): string {
  const text = `${game} ${selection}`
  const low = text.toLowerCase()
  const words = new Set(low.split(/[^a-z0-9à-ÿ]+/))
  if (/grand prix|\bgp\b/.test(low) || F1_DRIVERS.some(d => words.has(d))) return 'F1'
  if (/tour de france|\bgiro\b|\bvuelta\b/.test(low)) return 'Cyclisme'
  if (/\b(points?|rebonds?|passes?|assists?)\b/.test(low) || NBA.some(t => words.has(t))) return 'Basket'
  const sides = game.split(/\s+(?:vs\.?|v|-|–|contre)\s+/i).concat(selection.replace(/\s*[+\-−]\s?\d+([.,]\d+)?\s*$/, ''))
  if (sides.some(x => x.trim() && teamKeys.has(teamKey(x)))) return 'E-sport'
  if (/(^|[\s(])[A-Z]{1,2}[.,]\s?[A-Z][A-Za-zÀ-ÿ'-]+/.test(text) || /\b(sets?|jeux|jeu)\b/.test(low)) return 'Tennis'
  return 'Football'
}

// ── Formats ────────────────────────────────────────────────────────

/** Nombre affiché : point décimal, espace insécable entre les milliers (ex. 17 603.25). */
export function formatNum(n: number, d: number) {
  const [int, dec] = Math.abs(n).toFixed(d).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}${dec ? `.${dec}` : ''}`
}
const fr = formatNum
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')

/** Montant en euros ; avec `signed`, le signe est toujours affiché (lisible sans la couleur). */
export function formatEur(n: number, { signed = false, decimals = 2 } = {}) {
  // Le signe suit le montant arrondi : un reste de 0,000001 € s'affiche « 0,00 € », pas « +0,00 € »
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals || 0
  return `${signed ? sign(r) : r < 0 ? '−' : ''}${fr(Math.abs(r), decimals)}\u00a0€`
}
export function formatPct(n: number | null, { signed = false, decimals = 1 } = {}) {
  if (n == null) return '—'
  return `${signed ? sign(n) : n < 0 ? '−' : ''}${fr(Math.abs(n * 100), decimals)}\u00a0%`
}
