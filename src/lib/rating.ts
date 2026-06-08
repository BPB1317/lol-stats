import type { RatingEntry, TeamRating, Team, TeamBaseline, MatchNote, Match } from '@/types'

export interface RatingResult {
  output: number
  nbGames: number
  input: number
}

// 400 * log10(note / (1-note)) — transformée log-odds ELO standard (Excel LOG = base 10)
function noteToRawDelta(note: number): number {
  if (note <= 0 || note >= 1) return 0
  return 400 * Math.log10(note / (1 - note))
}

// Boost non-linéaire : performances extrêmes sont amplifiées
function adjustDelta(rawDelta: number): number {
  return rawDelta * (1 + 0.6 * Math.pow(Math.abs(rawDelta) / 300, 2))
}

// Performance ELO d'un match = input ELO de l'adversaire + delta ajusté
export function noteToPerformance(note: number, opponentInput: number): number {
  return opponentInput + adjustDelta(noteToRawDelta(note))
}

/**
 * Calcule l'output ELO à partir d'une liste de performances ELO par match.
 *
 * performances : ELO par match, triés récent → ancien
 * input        : ELO baseline de l'équipe pour la période
 * sensitivity  : variation max en ELO (ex: 100 points)
 *
 * Composante 1 – moyenne pondérée log des performances
 *   weight[i] = ln(max(1, n−i))  →  i=0 (récent): ln(n),  i=n-1 (ancien): 0
 * Composante 2 – win rate (performance > input = "victoire")
 *   (nb > input / n  −  0.5) × 2 × sensitivity
 * Output clamped dans [input−sensitivity, input+sensitivity]
 */
export function computeRating(
  performances: number[],
  input: number,
  sensitivity: number
): RatingResult {
  const n = performances.length
  if (n === 0) return { output: input, nbGames: 0, input }

  const weights = performances.map((_, i) => Math.log(Math.max(1, n - i)))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  const weightedMean =
    totalWeight > 0
      ? weights.reduce((s, w, i) => s + w * performances[i], 0) / totalWeight
      : input

  const wins = performances.filter(p => p > input).length
  const winRateAdj = (wins / n - 0.5) * 2 * sensitivity

  const raw = input + 0.5 * (weightedMean - input) + 0.5 * winRateAdj
  const output = Math.max(input - sensitivity, Math.min(input + sensitivity, raw))

  return { output, nbGames: n, input }
}

/**
 * Calcule le classement ELO de toutes les équipes d'une ligue.
 *
 * - Input  = baseline ELO la plus récente strictement avant sinceDate
 * - Pour chaque note, performance = input_adversaire + adjustDelta(log-odds)
 * - Output = moyenne pondérée des performances ± sensitivity
 * - Défaut 1500 si aucune baseline trouvée
 */
export function computeLeagueRatings(
  teams: Team[],
  baselines: TeamBaseline[],
  matches: Match[],
  notes: MatchNote[],
  sinceDate: string,
  sensitivity: number
): TeamRating[] {
  // 1ère passe : résoudre l'Input ELO de chaque équipe
  const inputMap: Record<string, number> = {}
  for (const team of teams) {
    const sorted = baselines
      .filter(b => b.team_id === team.id && b.effective_date <= sinceDate)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    inputMap[team.id] = sorted[0]?.rating ?? 1500
  }

  return teams.map(team => {
    const input = inputMap[team.id]
    const teamNotes: RatingEntry[] = []

    for (const note of notes) {
      if (note.note_date < sinceDate) continue

      let teamNote: number | null = null
      let opponentId: string | null = null

      if (note.team1_id === team.id) {
        teamNote = note.note_team1
        opponentId = note.team2_id
      } else if (note.team2_id === team.id) {
        teamNote = 1 - note.note_team1
        opponentId = note.team1_id
      }

      if (teamNote === null || opponentId === null) continue

      const opponentInput = inputMap[opponentId] ?? 1500
      const performance = noteToPerformance(teamNote, opponentInput)

      const match = matches.find(m => m.id === note.match_id)
      const opponent = match
        ? (opponentId === match.team1_id ? match.team1 : match.team2)
        : undefined

      teamNotes.push({
        note: teamNote,
        performance,
        date: note.note_date,
        matchId: note.match_id,
        opponentName: opponent?.name ?? '?',
      })
    }

    teamNotes.sort((a, b) => b.date.localeCompare(a.date))

    const result = computeRating(
      teamNotes.map(e => e.performance),
      input,
      sensitivity
    )

    return {
      team,
      input: result.input,
      output: result.output,
      delta: result.output - result.input,
      nbGames: result.nbGames,
      history: teamNotes,
    }
  })
}
