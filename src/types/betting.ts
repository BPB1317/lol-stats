// Types du côté parieur (tables de la migration 20261110_01_paris.sql)

export type Person = 'Squawo' | 'Kelicful'
export type Portfolio = 'commun' | 'kelicful' | 'squawo'
export type BetResult = 'En cours' | 'Gagnant' | 'Perdant' | '1/2 Gagnant' | '1/2 Perdant' | 'Remboursé'
export type BetStatus = 'Pris' | 'Vu pas pris'
export type Market = 'Vainqueur' | 'Handicap' | 'Over/Under' | 'Stats joueur' | 'Combiné' | 'Autre'
export type ClvMethod = 'ratio' | 'legacy_margin5'

export const RESULTS: BetResult[] = ['En cours', 'Gagnant', 'Perdant', '1/2 Gagnant', '1/2 Perdant', 'Remboursé']
export const SETTLED_RESULTS: BetResult[] = ['Gagnant', 'Perdant', '1/2 Gagnant', '1/2 Perdant']
export const MARKETS: Market[] = ['Vainqueur', 'Handicap', 'Over/Under', 'Stats joueur', 'Combiné', 'Autre']
export const DEFAULT_SPORTS = ['E-sport', 'Tennis', 'Football', 'Basket', 'F1', 'Cyclisme', 'Autre']

export interface Bet {
  id: string
  bet_date: string
  game: string | null
  selection: string
  sport: string
  stake: number
  odds: number
  result: BetResult
  status: BetStatus
  portfolio: Portfolio
  closing_odds: number | null
  clv: number | null
  clv_method: ClvMethod | null
  league: string | null
  market: Market | null
  placed_by: Person | null
  share_squawo: number | null
  note: string | null
  source: 'app' | 'import_excel'
  source_ref: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BetInput = Omit<Bet, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'source' | 'source_ref'> & {
  source?: Bet['source']
  source_ref?: string | null
}

export interface MoneyMove {
  id: string
  move_date: string
  kind: 'Retrait' | 'Dépôt' | 'Ajustement'
  person: Person | 'Les deux'
  amount: number
  portfolio: Portfolio
  note: string | null
  source: 'app' | 'import_excel'
  source_ref: string | null
  created_at: string
}

export interface ComptaLegacy {
  id: string
  paid_by: string | null
  paid_for: string | null
  date: string | null
  bet: string | null
  odds: number | null
  amount: number | null
  result: string | null
  pl: number | null
  comment: string | null
}

export interface AppSettings {
  default_share_squawo: number
  bankroll: number
  stake_exponent: number
  reset_date_commun: string | null
  reset_date_kelicful: string | null
  tennis_elo_weight_overall: number
  tennis_elo_weight_surface: number
  series_concentration: number
  sports: string[]
  compta_legacy_balance: number
}

export interface UserPrefs {
  user_id: string
  hidden_seasons: number[]
  last_sport: string | null
  last_portfolio: Portfolio | null
}

export interface TennisElo {
  id: string
  tour: 'ATP' | 'WTA'
  player: string
  elo: number | null
  helo: number | null
  celo: number | null
  gelo: number | null
  updated_at: string
}
