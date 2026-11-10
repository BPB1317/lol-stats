// Données 100 % fictives pour les drafts de DA — aucune donnée réelle, aucun nom d'équipe réel.
import { seriesProbs } from '@/lib/seriesOdds'

export type Sport = 'E-sport' | 'Tennis' | 'Football' | 'Basket' | 'F1' | 'Cyclisme'
export type Result = 'En cours' | 'Gagnant' | 'Perdant' | '1/2 Gagnant' | '1/2 Perdant' | 'Remboursé'

export interface FakeBet {
  id: number
  date: string
  game: string
  selection: string
  sport: Sport
  league?: string
  stake: number
  odds: number
  closing?: number
  result: Result
  placedBy: 'Squawo' | 'Kelicful'
}

// PRNG déterministe : les captures sont identiques d'un lancement à l'autre
function mulberry32(initial: number) {
  let seed = initial
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ESPORT = ['Nordlys', 'Kestrel Five', 'Basalt Gaming', 'Vanta Wolves', 'Rook Esports', 'Halcyon', 'Ironclad GG', 'Pallas Club', 'Meridian', 'Saltmarsh', 'Ember Unit', 'Quarry Kings']
const TENNIS = ['M. Darrow', 'L. Vesely', 'T. Okafor', 'R. Lindqvist', 'A. Moreau', 'J. Castell', 'K. Haldane', 'S. Ibarra']
const FOOT = ['FC Lindholm', 'Real Corvo', 'Sporting Aldea', 'Union Brenn', 'AS Valmont', 'Dynamo Kessel']
const LEAGUES = ['LEC', 'LCK', 'LPL', 'EMEA']

export function profit(b: Pick<FakeBet, 'stake' | 'odds' | 'result'>): number {
  switch (b.result) {
    case 'Gagnant': return b.stake * (b.odds - 1)
    case '1/2 Gagnant': return b.stake * (b.odds + 1) / 2 - b.stake
    case 'Perdant': return -b.stake
    case '1/2 Perdant': return -0.5 * b.stake
    default: return 0
  }
}

function makeBets(): FakeBet[] {
  const r = mulberry32(2026)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const bets: FakeBet[] = []
  const start = new Date('2024-01-08').getTime()
  const end = new Date('2026-11-08').getTime()
  let id = 1
  for (let t = start; t < end; t += 86400000 * (1 + Math.floor(r() * 4))) {
    const n = 1 + Math.floor(r() * 2)
    for (let k = 0; k < n; k++) {
      const sportRoll = r()
      const sport: Sport = sportRoll < 0.62 ? 'E-sport' : sportRoll < 0.8 ? 'Tennis' : sportRoll < 0.92 ? 'Football' : sportRoll < 0.97 ? 'Basket' : 'F1'
      let game: string, selection: string
      if (sport === 'E-sport') {
        const a = pick(ESPORT); let b = pick(ESPORT); while (b === a) b = pick(ESPORT)
        game = `${a} vs ${b}`
        const m = r()
        selection = m < 0.45 ? a : m < 0.75 ? `${a} -1.5` : m < 0.9 ? `${b} +1.5` : `Over 2.5 maps`
      } else if (sport === 'Tennis') {
        const a = pick(TENNIS); let b = pick(TENNIS); while (b === a) b = pick(TENNIS)
        game = `${a} vs ${b}`
        selection = r() < 0.6 ? a : `Over 10,5 jeux 1er set`
      } else if (sport === 'Football') {
        const a = pick(FOOT); let b = pick(FOOT); while (b === a) b = pick(FOOT)
        game = `${a} vs ${b}`
        selection = r() < 0.5 ? `${a} +0.5` : 'Plus de 2,5 buts'
      } else if (sport === 'Basket') {
        game = 'Harbor Gulls vs Mesa Drift'
        selection = 'Over 24,5 points J. Arden'
      } else {
        game = 'Grand Prix de Valmont'
        selection = 'Pilote n°4 podium'
      }
      const odds = Math.round((1.45 + r() * 1.6) * 100) / 100
      const stake = Math.round((80 + r() * 520) / 10) * 10
      const edge = 0.04
      const res = r()
      const pWin = 1 / odds + edge
      const date = new Date(t).toISOString().slice(0, 10)
      const settledCut = end - 86400000 * 3
      const result: Result = t > settledCut ? 'En cours'
        : res < 0.03 ? 'Remboursé'
        : res < 0.03 + pWin * 0.94 ? (r() < 0.04 ? '1/2 Gagnant' : 'Gagnant')
        : (r() < 0.04 ? '1/2 Perdant' : 'Perdant')
      const closing = r() < 0.75 ? Math.round(odds * (0.9 + r() * 0.16) * 100) / 100 : undefined
      bets.push({ id: id++, date, game, selection, sport, league: sport === 'E-sport' ? pick(LEAGUES) : undefined, stake, odds, closing, result, placedBy: r() < 0.55 ? 'Squawo' : 'Kelicful' })
    }
  }
  return bets
}

export const BETS = makeBets()
export const SETTLED = BETS.filter(b => ['Gagnant', 'Perdant', '1/2 Gagnant', '1/2 Perdant'].includes(b.result))
export const OPEN = BETS.filter(b => b.result === 'En cours')

export function summarize(bets: FakeBet[]) {
  const settled = bets.filter(b => ['Gagnant', 'Perdant', '1/2 Gagnant', '1/2 Perdant'].includes(b.result))
  const staked = settled.reduce((s, b) => s + b.stake, 0)
  const pl = settled.reduce((s, b) => s + profit(b), 0)
  const wins = settled.filter(b => b.result === 'Gagnant' || b.result === '1/2 Gagnant').length
  const withClv = settled.filter(b => b.closing)
  const clv = withClv.reduce((s, b) => s + (b.odds / b.closing! - 1), 0) / (withClv.length || 1)
  const clvPos = withClv.filter(b => b.odds > b.closing!).length / (withClv.length || 1)
  return { n: settled.length, staked, pl, roi: staked ? pl / staked : 0, hit: settled.length ? wins / settled.length : 0, wins, clv, clvPos, avgStake: staked / (settled.length || 1), avgOdds: settled.reduce((s, b) => s + b.odds, 0) / (settled.length || 1) }
}

export const TOTAL = summarize(BETS)
export const YEARS = [2024, 2025, 2026].map(y => ({ year: y, ...summarize(BETS.filter(b => b.date.startsWith(String(y)))) }))
export const BEST_YEAR = [...YEARS].sort((a, b) => b.pl - a.pl)[0]

// Bénéfice cumulé, un point par pari réglé
export const CUMULATIVE = (() => {
  let acc = 0
  return SETTLED.map(b => { acc += profit(b); return { date: b.date, value: acc } })
})()

export const MONTHS = (() => {
  const map = new Map<string, { pl: number; staked: number; n: number }>()
  for (const b of SETTLED) {
    const k = b.date.slice(0, 7)
    const e = map.get(k) ?? { pl: 0, staked: 0, n: 0 }
    e.pl += profit(b); e.staked += b.stake; e.n++
    map.set(k, e)
  }
  return [...map.entries()].map(([month, e]) => ({ month, ...e, roi: e.staked ? e.pl / e.staked : 0 }))
})()

export const RECENT = [...BETS].reverse().slice(0, 9)

// Classement Elo fictif d'une ligue
export const RANKING = (() => {
  const r = mulberry32(7)
  return ESPORT.slice(0, 10).map(name => {
    const input = Math.round(1450 + r() * 420)
    const gdm = Math.round((r() - 0.45) * 900)
    const perf = Math.round(input + gdm * 0.7 + (r() - 0.5) * 60)
    const output = Math.round(input + (perf - input) * 0.35)
    return { name, initials: (name.includes(' ') ? name.split(' ').map(w => w[0]).join('') : name).slice(0, 2).toUpperCase(), input, gdm, gd15: Math.round(gdm * 0.55), perf, output, games: 6 + Math.floor(r() * 8) }
  }).sort((a, b) => b.output - a.output)
})()

// Calculateur : deux équipes fictives, vraie logique seriesOdds
export const CALC = (() => {
  const a = RANKING[0], b = RANKING[3]
  const delta = a.output - b.output
  const p = 1 / (1 + Math.pow(10, -delta / 400))
  return { a, b, delta, p, sa: seriesProbs(p, 40), sb: seriesProbs(1 - p, 40) }
})()

export const SPORTS: Sport[] = ['E-sport', 'Tennis', 'Football', 'Basket', 'F1', 'Cyclisme']

// Matchs à venir (bande de jours) avec cote modèle
export const UPCOMING = [
  { day: 'LUN', date: '10', matches: [] as { t: string; a: string; b: string; oa: number; ob: number }[] },
  { day: 'MAR', date: '11', matches: [{ t: '17:00', a: 'Nordlys', b: 'Halcyon', oa: 1.62, ob: 2.61 }] },
  { day: 'MER', date: '12', matches: [{ t: '18:00', a: 'Kestrel Five', b: 'Meridian', oa: 1.38, ob: 3.63 }, { t: '20:00', a: 'Rook Esports', b: 'Saltmarsh', oa: 2.05, ob: 1.95 }] },
  { day: 'JEU', date: '13', matches: [{ t: '17:00', a: 'Basalt Gaming', b: 'Ember Unit', oa: 1.74, ob: 2.35 }] },
  { day: 'VEN', date: '14', matches: [{ t: '19:00', a: 'Vanta Wolves', b: 'Pallas Club', oa: 2.4, ob: 1.71 }] },
  { day: 'SAM', date: '15', matches: [] },
  { day: 'DIM', date: '16', matches: [{ t: '16:00', a: 'Ironclad GG', b: 'Quarry Kings', oa: 1.55, ob: 2.82 }] },
]

// Espace fine insécable (U+202F) absente de certaines polices mono → espace insécable classique
const fr = (n: number, d: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\u202f/g, '\u00a0')
export const eur = (n: number, sign = false) => {
  const s = fr(Math.abs(n), 2)
  return `${sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : n < 0 ? '−' : ''}${s}\u00a0€`
}
export const eur0 = (n: number, sign = false) => {
  const s = fr(Math.round(Math.abs(n)), 0)
  return `${sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : n < 0 ? '−' : ''}${s}\u00a0€`
}
export const pct = (n: number, sign = false, d = 1) => `${sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : n < 0 ? '−' : ''}${Math.abs(n * 100).toFixed(d).replace('.', ',')}\u00a0%`
export const odd = (n: number) => n.toFixed(2)
export const MONTH_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export const fmtDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

// Saison en cours (draft D) : bilan 2026, par sport, mois et courbe de l'année
export const SEASON_BETS = BETS.filter(b => b.date.startsWith('2026'))
export const SEASON = summarize(SEASON_BETS)
export const BY_SPORT = SPORTS.map(sp => ({ sport: sp, ...summarize(SEASON_BETS.filter(b => b.sport === sp)) })).filter(x => x.n > 0)
export const MONTHS_SEASON = MONTHS.filter(m => m.month.startsWith('2026'))
export const CUMULATIVE_SEASON = (() => {
  let acc = 0
  return SETTLED.filter(b => b.date.startsWith('2026')).map(b => { acc += profit(b); return { date: b.date, value: acc } })
})()
