// Probas BO3 / BO5 à partir de la proba BO1 p de l'équipe A (formules de l'Excel "Manual BO3/BO5").
// s = paramètre de concentration (Excel: s = 40) ; plus s est grand, plus les games sont indépendantes.

export interface SeriesProbs {
  bo3Win: number   // A gagne le BO3
  bo3M15: number   // A -1.5 (2-0)
  bo3P15: number   // A +1.5 (gagne au moins une game)
  bo5Win: number   // A gagne le BO5
  bo5M15: number   // A -1.5 (3-0 ou 3-1)
  bo5P15: number   // A +1.5
  bo5M25: number   // A -2.5 (3-0)
  bo5P25: number   // A +2.5
}

// Probas "brutes" du point de vue de l'équipe de proba p (q = 1 - p)
function sweepAndWin(p: number, s: number) {
  const q = 1 - p
  const bo3Sweep = p * (p * s + 1) / (s + 1)                                    // Excel 1/D18
  const bo3Win = bo3Sweep * (1 + 2 * q * s / (s + 2))                           // Excel A19
  const bo5Sweep = p * (p * s + 1) * (p * s + 2) / ((s + 1) * (s + 2))          // Excel 1/D26
  const bo5M15 = bo5Sweep * (1 + 3 * q * s / (s + 3))                           // Excel 1/D22
  const bo5Win = bo5M15 + 6 * bo5Sweep * q * s * (q * s + 1) / ((s + 3) * (s + 4)) // Excel A23
  return { bo3Sweep, bo3Win, bo5Sweep, bo5M15, bo5Win }
}

export function seriesProbs(p: number, s: number): SeriesProbs {
  const a = sweepAndWin(p, s)
  const b = sweepAndWin(1 - p, s)
  return {
    bo3Win: a.bo3Win,
    bo3M15: a.bo3Sweep,
    bo3P15: 1 - b.bo3Sweep,
    bo5Win: a.bo5Win,
    bo5M15: a.bo5M15,
    bo5P15: 1 - b.bo5M15,
    bo5M25: a.bo5Sweep,
    bo5P25: 1 - b.bo5Sweep,
  }
}
