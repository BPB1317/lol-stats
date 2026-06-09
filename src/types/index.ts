export interface League {
  id: string
  name: string
  short_name: string
  season: string
  threshold: number
  sort_order: number
  created_at: string
}

export interface Team {
  id: string
  league_id: string
  name: string
  created_at: string
}

export interface TeamBaseline {
  id: string
  team_id: string
  rating: number
  effective_date: string
  bo_type: string
  created_at: string
}

export interface Match {
  id: string
  league_id: string
  team1_id: string
  team2_id: string
  winner_id: string | null
  score: string | null
  stage: string
  match_date: string
  created_at: string
  team1?: Team
  team2?: Team
  winner?: Team | null
}

export interface MatchNote {
  id: string
  match_id: string
  note_date: string
  note_team1: number
  team1_id: string
  team2_id: string
  created_at: string
}

export interface RatingEntry {
  note: number        // valeur 0-1 saisie par l'utilisateur
  performance: number // ELO de la performance (opponent_input + adjusted_delta)
  won: boolean        // résultat réel du match (winner_id === team.id)
  date: string
  matchId: string
  opponentName: string
}

export interface TeamRating {
  team: Team
  input: number
  inputBoType: string
  output: number
  delta: number
  nbGames: number
  history: RatingEntry[]
}
