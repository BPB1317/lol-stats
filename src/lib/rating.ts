import type { RatingEntry, TeamRating, Team, TeamBaseline, MatchNote, Match } from '@/types'

export interface RatingResult {
  output: number
  nbGames: number
  input: number
}

/**
 * Reproduction fidèle de la formule Excel (colonne D du RANK).
 *
 * odds  : notes [0-1] triées du plus récent au plus ancien
 * input : baseline (rating avant la fenêtre "since")
 * sensitivity : variation max autorisée (ex: 0.1 = ±10%)
 *
 * Composante 1 – moyenne pondérée log des écarts vs input
 *   weight[i] = ln(max(1, n−i))  →  i=0 (récent): ln(n),  i=n-1 (ancien): ln(1)=0
 * Composante 2 – win rate vs input
 *   (nb de notes > input / n  −  0.5) × 2 × sensitivity
 * Output clamped dans [input−sensitivity, input+sensitivity]
 */
export function computeRating(
  odds: number[],
  input: number,
  sensitivity: number
): RatingResult {
  const n = odds.length
  if (n === 0) return { output: input, nbGames: 0, input }

  const weights = odds.map((_, i) => Math.log(Math.max(1, n - i)))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  const weightedAvg =
    totalWeight > 0
      ? weights.reduce((s, w, i) => s + w * (odds[i] - input), 0) / totalWeight
      : 0

  const wins = odds.filter(o => o > input).length
  const winRateAdj = (wins / n - 0.5) * 2 * sensitivity

  const raw = input + 0.5 * weightedAvg + 0.5 * winRateAdj
  const output = Math.max(input - sensitivity, Math.min(input + sensitivity, raw))

  return { output, nbGames: n, input }
}

/**
 * Calcule le rating de chaque équipe d'une ligue.
 *
 * - sinceDate  : seules les notes >= sinceDate sont prises en compte
 * - sensitivity: paramètre de sensibilité
 * - input d'une équipe = baseline la plus récente avant sinceDate
 *   (si aucune baseline → 0.5 par défaut)
 */
export function computeLeagueRatings(
  teams: Team[],
  baselines: TeamBaseline[],
  matches: Match[],
  notes: MatchNote[],
  sinceDate: string,
  sensitivity: number
): TeamRating[] {
  return teams.map(team => {
    // Input = baseline la plus récente avant sinceDate
    const teamBaselines = baselines
      .filter(b => b.team_id === team.id && b.effective_date < sinceDate)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    const input = teamBaselines[0]?.rating ?? 0.5

    // Notes de l'équipe dans la fenêtre (>= sinceDate), triées récent → ancien
    const teamNotes: RatingEntry[] = []

    for (const note of notes) {
      if (note.note_date < sinceDate) continue

      let entryNote: number | null = null
      let opponentId: string | null = null

      if (note.team1_id === team.id) {
        entryNote = note.note_team1
        opponentId = note.team2_id
      } else if (note.team2_id === team.id) {
        entryNote = 1 - note.note_team1
        opponentId = note.team1_id
      }

      if (entryNote === null) continue

      const match = matches.find(m => m.id === note.match_id)
      const opponent = match
        ? (opponentId === match.team1_id ? match.team1 : match.team2)
        : undefined

      teamNotes.push({
        note: entryNote,
        date: note.note_date,
        matchId: note.match_id,
        opponentName: opponent?.name ?? '?',
      })
    }

    // Trier récent → ancien
    teamNotes.sort((a, b) => b.date.localeCompare(a.date))

    const result = computeRating(
      teamNotes.map(e => e.note),
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
