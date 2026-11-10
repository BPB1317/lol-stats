// Elo tennis : lecture du collage Tennis Abstract (ou d'un CSV), Elo combinés « Elo + surface », probabilité de victoire.
import type { TennisElo } from '@/types/betting'

export type Surface = 'dur' | 'terre' | 'gazon'
export const SURFACES: { key: Surface; label: string; col: 'helo' | 'celo' | 'gelo' }[] = [
  { key: 'dur', label: 'Dur', col: 'helo' },
  { key: 'terre', label: 'Terre', col: 'celo' },
  { key: 'gazon', label: 'Gazon', col: 'gelo' },
]

export type ParsedElo = Pick<TennisElo, 'player' | 'elo' | 'helo' | 'celo' | 'gelo'>

const toNum = (s: string | undefined) => {
  if (s == null) return null
  const v = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

/**
 * Lit un tableau collé depuis Tennis Abstract (colonnes séparées par des tabulations) ou un CSV (« ; » ou « , »).
 * Les colonnes sont repérées par leur en-tête : Player, Elo, hElo, cElo, gElo (insensible à la casse).
 * Sans en-tête reconnu : ordre supposé joueur, Elo, Elo dur, Elo terre, Elo gazon.
 */
export function parseEloPaste(text: string): { rows: ParsedElo[]; skipped: number; headerFound: boolean } {
  const lines = text.split(/\r?\n/).map(l => l.replace(/\u00a0/g, ' ')).filter(l => l.trim())
  if (!lines.length) return { rows: [], skipped: 0, headerFound: false }
  const sep = lines.some(l => l.includes('\t')) ? '\t' : lines[0].includes(';') ? ';' : ','
  const split = (l: string) => l.split(sep).map(c => c.trim())

  const headerIdx = lines.findIndex(l => {
    const cells = split(l).map(c => c.toLowerCase())
    return cells.includes('player') && cells.includes('elo')
  })
  let col = { player: 0, elo: 1, helo: 2, celo: 3, gelo: 4 }
  if (headerIdx >= 0) {
    const cells = split(lines[headerIdx]).map(c => c.toLowerCase())
    col = { player: cells.indexOf('player'), elo: cells.indexOf('elo'), helo: cells.indexOf('helo'), celo: cells.indexOf('celo'), gelo: cells.indexOf('gelo') }
  }
  const rows: ParsedElo[] = []
  let skipped = 0
  for (const line of lines.slice(headerIdx + 1)) {
    const c = split(line)
    const player = c[col.player]?.trim()
    const elo = toNum(c[col.elo])
    if (!player || elo == null || /^player$/i.test(player)) { skipped++; continue }
    rows.push({ player, elo, helo: col.helo >= 0 ? toNum(c[col.helo]) : null, celo: col.celo >= 0 ? toNum(c[col.celo]) : null, gelo: col.gelo >= 0 ? toNum(c[col.gelo]) : null })
  }
  // Un même joueur ne doit apparaître qu'une fois (contrainte unique tour + joueur)
  const seen = new Set<string>()
  const unique = rows.filter(r => (seen.has(r.player) ? false : (seen.add(r.player), true)))
  return { rows: unique, skipped: skipped + rows.length - unique.length, headerFound: headerIdx >= 0 }
}

/** Part de l'Elo général pour chaque surface (la part de l'Elo surface est 1 − cette valeur). */
export type SurfaceWeights = Record<Surface, number>

/** « Elo + surface » = w × Elo + (1 − w) × Elo surface, w propre à la surface (null si l'Elo surface manque). */
export function combinedElo(p: Pick<TennisElo, 'elo' | 'helo' | 'celo' | 'gelo'>, surface: Surface, weights: SurfaceWeights): number | null {
  const s = p[SURFACES.find(x => x.key === surface)!.col]
  if (p.elo == null || s == null) return null
  const w = weights[surface]
  return w * Number(p.elo) + (1 - w) * Number(s)
}

/** Probabilité que A batte B : 1 / (1 + 10^((Elo_B − Elo_A)/400)). */
export const eloProb = (a: number, b: number) => 1 / (1 + Math.pow(10, (b - a) / 400))
