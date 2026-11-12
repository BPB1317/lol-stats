import { describe, expect, it } from 'vitest'
import type { Bet, MoneyMove } from '@/types/betting'
import {
  resultProfit, profit, theoreticalSummary, summarize, clvRatio, visible, cumulative, groupSummaries,
  whoHasWhat, interPersonBalance, inferMarket, inferSport, formatEur, formatPct,
} from './betStats'

let n = 0
function bet(p: Partial<Bet>): Bet {
  return {
    id: String(++n), bet_date: '2026-03-01', game: 'A vs B', selection: 'A', sport: 'E-sport', stake: 100, odds: 2,
    result: 'Gagnant', status: 'Pris', portfolio: 'commun', closing_odds: null, clv: null, clv_method: null, league: null,
    market: null, placed_by: null, share_squawo: null, note: null, is_live: false, source: 'app', source_ref: null, created_by: null,
    created_at: '', updated_at: '', ...p,
  }
}
function move(p: Partial<MoneyMove>): MoneyMove {
  return { id: String(++n), move_date: '2026-03-01', kind: 'Retrait', person: 'Squawo', amount: 100, portfolio: 'commun', note: null, source: 'app', source_ref: null, created_at: '', ...p }
}

describe('bénéfice (formules de l’Excel)', () => {
  it('Gagnant : mise × (cote − 1)', () => expect(resultProfit({ stake: 100, odds: 1.85, result: 'Gagnant' })).toBeCloseTo(85))
  it('1/2 Gagnant : mise × (cote + 1)/2 − mise', () => expect(resultProfit({ stake: 100, odds: 1.9, result: '1/2 Gagnant' })).toBeCloseTo(45))
  it('Perdant : −mise', () => expect(resultProfit({ stake: 100, odds: 2.5, result: 'Perdant' })).toBe(-100))
  it('1/2 Perdant : −0,5 × mise', () => expect(resultProfit({ stake: 100, odds: 2.5, result: '1/2 Perdant' })).toBe(-50))
  it('Remboursé et En cours : 0', () => {
    expect(resultProfit({ stake: 100, odds: 2, result: 'Remboursé' })).toBe(0)
    expect(resultProfit({ stake: 100, odds: 2, result: 'En cours' })).toBe(0)
  })
  it('Vu pas pris : 0 en réel, théorique calculé à part', () => {
    const b = bet({ status: 'Vu pas pris', result: 'Gagnant', odds: 3 })
    expect(profit(b)).toBe(0)
    expect(theoreticalSummary([b]).profit).toBe(200)
    expect(theoreticalSummary([b], 10).profit).toBe(20) // à mise fixe
  })
})

describe('bilan', () => {
  const bets = [
    bet({ result: 'Gagnant', stake: 100, odds: 2, clv: 0.05, clv_method: 'ratio' }),
    bet({ result: 'Perdant', stake: 100, odds: 2, clv: -0.02, clv_method: 'ratio' }),
    bet({ result: '1/2 Gagnant', stake: 100, odds: 3 }),
    bet({ result: 'Remboursé', stake: 500, odds: 2 }),
    bet({ result: 'En cours', stake: 300, odds: 2 }),
    bet({ result: 'Gagnant', status: 'Vu pas pris', stake: 1000, odds: 5 }),
  ]
  const s = summarize(bets)
  it('ne compte que les paris réglés et pris', () => {
    expect(s.count).toBe(3)
    expect(s.refunded).toBe(1)
    expect(s.pending).toBe(1)
    expect(s.staked).toBe(300)
  })
  it('bénéfice, ROI et réussite', () => {
    expect(s.profit).toBeCloseTo(100 - 100 + 100)
    expect(s.roi).toBeCloseTo(100 / 300)
    expect(s.hitRate).toBeCloseTo(2 / 3)
  })
  it('CLV moyen et part positive', () => {
    expect(s.clvAvg).toBeCloseTo(0.015)
    expect(s.clvPositiveShare).toBe(0.5)
    expect(s.clvMixed).toBe(false)
  })
  it('les ajustements comptent dans bénéfice et ROI, pas dans le nombre ni la réussite ; les retraits jamais', () => {
    const t = summarize(bets, [move({ kind: 'Ajustement', amount: 60 }), move({ kind: 'Retrait', amount: 999 })])
    expect(t.profit).toBeCloseTo(160)
    expect(t.roi).toBeCloseTo(160 / 300)
    expect(t.count).toBe(3)
    expect(t.hitRate).toBeCloseTo(2 / 3)
  })
  it('signale le mélange des méthodes de CLV', () => {
    expect(summarize([bet({ clv: 0.1, clv_method: 'legacy_margin5' }), bet({ clv: 0.1, clv_method: 'ratio' })]).clvMixed).toBe(true)
  })
  it('contrôle de l’Excel 2024 : 0 € de paris + 2 960 € d’ajustements', () => {
    const adj = Array.from({ length: 10 }, (_, i) => move({ kind: 'Ajustement', amount: 269.09, move_date: `2024-${String(i + 1).padStart(2, '0')}-28` }))
      .concat(move({ kind: 'Ajustement', amount: 269.1, move_date: '2024-11-02' }))
    expect(summarize([], adj).profit).toBeCloseTo(2960, 2)
  })
})

describe('CLV', () => {
  it('ratio : cote ÷ clôture − 1', () => expect(clvRatio(2.1, 2)).toBeCloseTo(0.05))
  it('sans clôture : null', () => expect(clvRatio(2, null)).toBeNull())
})

describe('masquage et remise à zéro', () => {
  const rows = [bet({ bet_date: '2024-05-01' }), bet({ bet_date: '2025-05-01' }), bet({ bet_date: '2026-05-01' })]
  it('saisons masquées', () => expect(visible(rows, { hiddenSeasons: [2024] }).length).toBe(2))
  it('date de remise à zéro', () => expect(visible(rows, { resetDate: '2026-01-01' }).length).toBe(1))
})

describe('regroupements et courbe', () => {
  const bets = [bet({ bet_date: '2025-01-03', result: 'Gagnant' }), bet({ bet_date: '2025-01-03', result: 'Perdant' }), bet({ bet_date: '2026-02-01', result: 'Gagnant' })]
  it('cumul, un point par date', () => expect(cumulative(bets)).toEqual([{ date: '2025-01-03', value: 0 }, { date: '2026-02-01', value: 100 }]))
  it('par année', () => expect(groupSummaries(bets, [], d => d.slice(0, 4)).map(g => [g.key, g.count, g.profit])).toEqual([['2025', 2, 0], ['2026', 1, 100]]))
})

describe('partage', () => {
  it('50/50 par défaut, % du pari prioritaire, retraits déduits', () => {
    const r = whoHasWhat(
      [bet({ result: 'Gagnant', stake: 100, odds: 3 }), bet({ result: 'Gagnant', stake: 100, odds: 2, share_squawo: 100 })],
      [move({ kind: 'Retrait', person: 'Kelicful', amount: 30 })],
      50,
    )
    expect(r.squawo.earned).toBeCloseTo(100 + 100)
    expect(r.kelicful.earned).toBeCloseTo(100)
    expect(r.kelicful.remaining).toBeCloseTo(70)
  })
  it('compta entre nous : part du solde historique (Kelicful doit à Squawo)', () => {
    expect(interPersonBalance([], 1584.48).balance).toBeCloseTo(1584.48)
  })
  it('compta entre nous : même logique que la formule de « Compta Kévin »', () => {
    // −P/L des paris payés par Squawo pour Kelicful + P/L des paris payés par Kelicful pour Squawo
    const lostForKelicful = bet({ placed_by: 'Squawo', portfolio: 'kelicful', result: 'Perdant', stake: 20 })   // Kelicful doit 20 de plus
    const wonForKelicful = bet({ placed_by: 'Squawo', portfolio: 'kelicful', result: 'Gagnant', stake: 30, odds: 1.9 }) // Squawo détient 27 dus à Kelicful
    const commun = bet({ placed_by: 'Kelicful', portfolio: 'commun', result: 'Perdant', stake: 500 })           // pas concerné
    const r = interPersonBalance([lostForKelicful, wonForKelicful, commun], 1584.48)
    expect(r.balance).toBeCloseTo(1584.48 + 20 - 27)
    expect(r.concerned.length).toBe(2)
  })
  it('règlement : Kelicful paie 500 € à Squawo → la dette baisse de 500 ; bilans et bankroll inchangés', () => {
    const pay = move({ kind: 'Règlement', person: 'Kelicful', amount: 500 })
    expect(interPersonBalance([], 1584.48, [pay]).balance).toBeCloseTo(1084.48)
    expect(interPersonBalance([], 100, [move({ kind: 'Règlement', person: 'Squawo', amount: 30 })]).balance).toBeCloseTo(130)
    expect(summarize([], [pay]).profit).toBe(0)
    expect(whoHasWhat([], [pay], 50).kelicful.remaining).toBe(0)
  })
})

describe('déductions à la saisie', () => {
  it('marché', () => {
    expect(inferMarket('G2 Esports -1.5')).toBe('Handicap')
    expect(inferMarket('Nordlys +1,5')).toBe('Handicap')
    expect(inferMarket('Over 10,5 jeux 1er set')).toBe('Over/Under')
    expect(inferMarket('Plus de 2,5 buts')).toBe('Over/Under')
    expect(inferMarket('Over 24,5 points J. Arden')).toBe('Stats joueur')
    expect(inferMarket('G2 Esports')).toBe('Vainqueur')
    expect(inferMarket('G2 + T1 combiné')).toBe('Combiné')
    expect(inferMarket('Favo LFL x 5')).toBe('Combiné')
  })
  it('sport, dans l’ordre des règles', () => {
    const teams = new Set(['g2 esports', 'dplus kia'])
    expect(inferSport('Grand Prix de Monaco', 'Verstappen vainqueur', teams)).toBe('F1')
    expect(inferSport('Tour de France étape 12', 'Pogacar', teams)).toBe('Cyclisme')
    expect(inferSport('Heat vs Knicks', 'Heat', teams)).toBe('Basket')
    expect(inferSport('G2 Esports vs Dplus KIA', 'G2 Esports -1.5', teams)).toBe('E-sport')
    expect(inferSport('(LEC) G2 Esports vs T1', 'T1', teams)).toBe('E-sport')
    expect(inferSport('J. Sinner - A, Tabilo', 'J. Sinner', teams)).toBe('Tennis')
    expect(inferSport('TM. Etcheverry vs X. Y', 'Over 22,5 jeux', teams)).toBe('Tennis')
    expect(inferSport('Lens vs Lille', 'Lens', teams)).toBe('Football')
  })
})

describe('formats', () => {
  it('signe toujours affiché', () => {
    expect(formatEur(1234.5, { signed: true })).toBe('+1\u00a0234.50\u00a0€')
    expect(formatEur(-12, { signed: true, decimals: 0 })).toBe('−12\u00a0€')
    expect(formatPct(0.123, { signed: true })).toBe('+12.3\u00a0%')
    expect(formatEur(0.0000004, { signed: true })).toBe('0.00\u00a0€')
    expect(formatEur(-0.004, { signed: true })).toBe('0.00\u00a0€')
  })
})
