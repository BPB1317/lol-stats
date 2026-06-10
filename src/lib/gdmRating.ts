import type { Team, TeamBaseline, Match, GdmStat, GdmTeamRating } from '@/types'

function parseGames(score: string | null): number {
  if (!score) return 1
  const m = score.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (!m) return 1
  return parseInt(m[1]) + parseInt(m[2])
}

// Perf = Avg.Opp + 280 si GDM > 400, sinon Avg.Opp + 0.7*GDM
function computePerf(gdm: number, avgOpp: number): number {
  return gdm > 400 ? avgOpp + 280 : avgOpp + 0.7 * gdm
}

// Formule Output ELO GDM
// k = 3.5 * games, base = 36 si games < 9 sinon 48
// si Perf > Input : ((base-k)*Input + Perf*k) / base
// si Perf <= Input : (base*Input + Perf*k) / (base+k)
function computeOutput(input: number, perf: number, games: number): number {
  const k = 3.5 * games
  const base = games < 9 ? 36 : 48
  if (perf > input) {
    return ((base - k) * input + perf * k) / base
  }
  return (base * input + perf * k) / (base + k)
}

export function computeGdmRatings(
  teams: Team[],
  baselines: TeamBaseline[],
  matches: Match[],
  gdmStats: GdmStat[],
  sinceDate: string
): GdmTeamRating[] {
  // Résoudre l'Input ELO de chaque équipe
  const inputMap: Record<string, number> = {}
  const boTypeMap: Record<string, string> = {}
  for (const team of teams) {
    const sorted = baselines
      .filter(b => b.team_id === team.id && b.effective_date <= sinceDate)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    inputMap[team.id] = sorted[0]?.rating ?? 1500
    boTypeMap[team.id] = sorted[0]?.bo_type ?? ''
  }

  // Stages qualifiants : tous les matchs du stage ont match_date >= sinceDate
  // On normalise en uppercase pour éviter les mismatches de casse
  const stageMinDate: Record<string, string> = {}
  for (const m of matches) {
    if (!m.stage) continue
    const s = m.stage.toUpperCase()
    if (!stageMinDate[s] || m.match_date < stageMinDate[s]) {
      stageMinDate[s] = m.match_date
    }
  }
  const qualifyingStages = new Set(
    Object.entries(stageMinDate)
      .filter(([, minDate]) => minDate >= sinceDate)
      .map(([stage]) => stage)
  )

  return teams.map(team => {
    const input = inputMap[team.id]

    // Stats GDM pour les stages qualifiants (normalisation casse)
    const teamStats = gdmStats.filter(
      s => s.team_id === team.id && qualifyingStages.has(s.stage.toUpperCase())
    )
    const totalStatGames = teamStats.reduce((sum, s) => sum + s.games, 0)

    let gdm: number | null = null
    let gd15: number | null = null

    if (totalStatGames > 0) {
      gdm = teamStats.reduce((sum, s) => sum + s.gdm * s.games, 0) / totalStatGames

      const statsWithGd15 = teamStats.filter(s => s.gd15 != null)
      const totalGd15Games = statsWithGd15.reduce((sum, s) => sum + s.games, 0)
      if (totalGd15Games > 0) {
        gd15 = statsWithGd15.reduce((sum, s) => sum + s.gd15! * s.games, 0) / totalGd15Games
      }
    }

    // Avg.Opp pondéré par games, total games depuis le calendrier
    const teamMatches = matches.filter(
      m => qualifyingStages.has(m.stage.toUpperCase()) &&
           (m.team1_id === team.id || m.team2_id === team.id)
    )

    let weightedOppElo = 0
    let totalOppGames = 0
    let totalCalGames = 0

    for (const m of teamMatches) {
      const oppId = m.team1_id === team.id ? m.team2_id : m.team1_id
      const oppElo = inputMap[oppId] ?? 1500
      const g = parseGames(m.score)
      weightedOppElo += oppElo * g
      totalOppGames += g
      totalCalGames += g
    }

    const avgOpp = totalOppGames > 0 ? weightedOppElo / totalOppGames : null
    const games = totalCalGames

    let perf: number | null = null
    let output: number | null = null

    if (gdm != null && avgOpp != null && games > 0) {
      perf = computePerf(gdm, avgOpp)
      output = computeOutput(input, perf, games)
    }

    return {
      team,
      input,
      inputBoType: boTypeMap[team.id],
      gdm,
      gd15,
      avgOpp,
      games,
      perf,
      output,
    }
  })
}
