// Valeurs de référence : exemples présents dans l'Excel « LoL_2026 »
import { describe, expect, it } from 'vitest'
import { drawCover, valueStake, liveHedge, gapToProb, probToGap, otherSide } from './calculators'

describe('remboursé si nul et +0,5 (Handicap calculator : paok 2,87 · 150 € · nul 3,41)', () => {
  const r = drawCover(2.87, 150, 3.41)
  it('remboursé si nul', () => {
    expect(r.dnb.drawStake).toBeCloseTo(62.2406639, 6)
    expect(r.dnb.odds).toBeCloseTo(2.028357771, 6)
    expect(r.dnb.total).toBeCloseTo(212.2406639, 6)
  })
  it('+0,5', () => {
    expect(r.plusHalf.drawStake).toBeCloseTo(126.2463343, 6)
    expect(r.plusHalf.odds).toBeCloseTo(1.55839172, 6)
    expect(r.plusHalf.total).toBeCloseTo(276.2463343, 6)
  })
})

describe('mise selon la value (Bilan 2026 : 2,39 proposée · 2,2 réelle · 5 000 € · −0,7)', () => {
  const r = valueStake(2.39, 2.2, 5000, -0.7)
  it('value, facteur, gain visé, mise', () => {
    expect(r.value).toBeCloseTo(0.08636363636, 8)
    expect(r.factor).toBeCloseTo(1.151686084, 8)
    expect(r.targetGain).toBeCloseTo(497.3189907, 5)
    expect(r.stake).toBeCloseTo(226.0540867, 5)
  })
})

describe('couverture en live (Bilan Kelicful 2026 : 90 € à 1,574, couverture à 10)', () => {
  const r = liveHedge(90, 1.574, 10)
  it('remboursement', () => {
    expect(r.ret).toBeCloseTo(141.66, 6)
    expect(r.profit).toBeCloseTo(51.66, 6)
    expect(r.refund.stake).toBeCloseTo(10, 6)
    expect(r.refund.profit).toBeCloseTo(41.66, 6)
    expect(r.refund.total).toBeCloseTo(100, 6)
    expect(r.refund.odds).toBeCloseTo(1.42, 2)
  })
  it('double chance', () => {
    expect(r.doubleChance.stake).toBeCloseTo(14.166, 6)
    expect(r.doubleChance.profit).toBeCloseTo(37.494, 6)
    expect(r.doubleChance.total).toBeCloseTo(104.166, 3)
    expect(r.doubleChance.odds).toBeCloseTo(1.36, 2)
  })
})

describe('Elo ↔ cote (bloc « Ecart d’elo »)', () => {
  it('écart 144 → 69,61 % → 1,4365 / 3,2909', () => {
    const p = gapToProb(144)
    expect(p * 100).toBeCloseTo(69.61287704, 6)
    expect(1 / p).toBeCloseTo(1.436515832, 6)
    expect(otherSide(1 / p)).toBeCloseTo(3.290867653, 6)
  })
  it('60 % → écart 70,44', () => expect(probToGap(0.6)).toBeCloseTo(70.43650362, 6))
})
