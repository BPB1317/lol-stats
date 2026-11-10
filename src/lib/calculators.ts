// Calculateurs repris de l'Excel (onglet « Handicap calculator », blocs des onglets Bilan). Formules à l'identique.

/** Foot depuis le 1X2 : « remboursé si nul » (DNB) et « +0,5 » en couvrant le nul. */
export function drawCover(odds: number, stake: number, drawOdds: number) {
  const dnbDraw = stake / (drawOdds - 1)          // mise de couverture sur le nul (remboursé si nul)
  const plusDraw = stake * odds / drawOdds        // mise sur le nul pour un +0,5
  return {
    dnb: { drawStake: dnbDraw, odds: odds * stake / (stake + dnbDraw), total: stake + dnbDraw },
    plusHalf: { drawStake: plusDraw, odds: odds * stake / (stake + plusDraw), total: stake + plusDraw },
  }
}

/** Mise selon la value : value = cote proposée / cote réelle − 1 ; facteur = 2 × réelle^exposant. */
export function valueStake(offered: number, fair: number, bankroll: number, exponent: number) {
  const value = offered / fair - 1
  const factor = 2 * Math.pow(fair, exponent)
  const targetGain = value * bankroll * factor
  return { value, factor, targetGain, stake: targetGain / fair }
}

/** Couverture en live : rembourser la mise ou passer en double chance avec une cote de couverture. */
export function liveHedge(stake: number, odds: number, hedgeOdds: number) {
  const ret = stake * odds                       // gain brut si le pari passe
  const profit = ret - stake
  const refundStake = stake / (hedgeOdds - 1)
  const dcStake = ret / hedgeOdds
  const refundProfit = profit - refundStake
  const dcProfit = profit - dcStake
  return {
    ret, profit,
    refund: { stake: refundStake, profit: refundProfit, total: stake + refundStake, odds: refundProfit / (stake + refundStake) + 1 },
    doubleChance: { stake: dcStake, profit: dcProfit, total: stake + dcStake, odds: dcProfit / (stake + dcStake) + 1 },
  }
}

/** Écart d'Elo → probabilité (0–1) : 1 / (1 + 10^(−écart/400)). */
export const gapToProb = (gap: number) => 1 / (1 + Math.pow(10, -gap / 400))
/** Probabilité (0–1) → écart d'Elo : 400 × log10(p / (1 − p)). */
export const probToGap = (p: number) => 400 * Math.log10(p / (1 - p))
/** Cote juste du côté opposé : 1 / (1 − 1/cote). */
export const otherSide = (odds: number) => 1 / (1 - 1 / odds)
