import { describe, expect, it } from 'vitest'
import { parseEloPaste, combinedElo, eloProb } from './tennis'

describe('collage Tennis Abstract', () => {
  it('repère les colonnes par leur en-tête (tabulations)', () => {
    const text = [
      'Elo Rank\tPlayer\tAge\tElo\t\thElo Rank\thElo\tcElo Rank\tcElo\tgElo Rank\tgElo\tPeak Elo',
      '1\tJannik Sinner\t25.2\t2244.6\t\t1\t2210.3\t2\t2105.1\t1\t2150.0\t2260',
      '2\tCarlos Alcaraz\t23.4\t2190.1\t\t2\t2120.0\t1\t2180.5\t2\t2140.2\t2230',
    ].join('\n')
    const r = parseEloPaste(text)
    expect(r.headerFound).toBe(true)
    expect(r.rows).toEqual([
      { player: 'Jannik Sinner', elo: 2244.6, helo: 2210.3, celo: 2105.1, gelo: 2150 },
      { player: 'Carlos Alcaraz', elo: 2190.1, helo: 2120, celo: 2180.5, gelo: 2140.2 },
    ])
  })
  it('CSV sans en-tête : joueur, Elo, dur, terre, gazon ; surface manquante = null', () => {
    const r = parseEloPaste('A. Player;1800;1810;;1750\nB. Player;1700,5;1690;1720;1650')
    expect(r.rows[0]).toEqual({ player: 'A. Player', elo: 1800, helo: 1810, celo: null, gelo: 1750 })
    expect(r.rows[1].elo).toBe(1700.5)
  })
  it('ignore les lignes illisibles et les doublons', () => {
    const r = parseEloPaste('Player,Elo\nX,1500\nX,1510\n,1400\nY,abc')
    expect(r.rows).toEqual([{ player: 'X', elo: 1500, helo: null, celo: null, gelo: null }])
    expect(r.skipped).toBe(3)
  })
})

describe('Elo combinés et probabilité', () => {
  it('0,4 × Elo + 0,6 × Elo surface', () => {
    expect(combinedElo({ elo: 2000, helo: 2100, celo: null, gelo: 1900 }, 'dur', 0.4, 0.6)).toBeCloseTo(2060)
    expect(combinedElo({ elo: 2000, helo: 2100, celo: null, gelo: 1900 }, 'terre', 0.4, 0.6)).toBeNull()
  })
  it('1 / (1 + 10^((B − A)/400))', () => {
    expect(eloProb(1600, 1600)).toBeCloseTo(0.5)
    expect(eloProb(1800, 1600)).toBeCloseTo(0.7597, 3)
  })
})
