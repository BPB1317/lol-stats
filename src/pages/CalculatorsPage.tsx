// Calculateurs : cotes BO3/BO5 (modèles) et calculateurs repris de l'Excel.
import { useState, type ReactNode } from 'react'
import { EloCalculator } from '@/components/league/EloCalculator'
import { useSettings } from '@/hooks/useBetting'
import { drawCover, valueStake, liveHedge, gapToProb, probToGap, otherSide } from '@/lib/calculators'
import { formatEur, formatPct } from '@/lib/betStats'

const num = (s: string) => parseFloat(s.replace(',', '.'))
const ok = (...v: number[]) => v.every(x => Number.isFinite(x))

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function In({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label className="block min-w-0"><span className="mb-1 block text-xs text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <input inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} className="field w-full px-2.5 py-2 font-mono text-sm" />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  )
}

function Out({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-mono ${strong ? 'text-lg font-semibold' : 'text-sm'}`}>{value}</span>
    </div>
  )
}

function DrawCover() {
  const [odds, setOdds] = useState('2.87'), [stake, setStake] = useState('150'), [draw, setDraw] = useState('3.41')
  const o = num(odds), s = num(stake), d = num(draw)
  const r = ok(o, s, d) && o > 1 && s > 0 && d > 1 ? drawCover(o, s, d) : null
  return (
    <Card title="Foot : remboursé si nul et +0,5" sub="Depuis la cote 1X2 de l'équipe et la cote du nul.">
      <div className="grid grid-cols-3 gap-2">
        <In label="Cote équipe" value={odds} onChange={setOdds} /><In label="Mise" value={stake} onChange={setStake} suffix="€" /><In label="Cote du nul" value={draw} onChange={setDraw} />
      </div>
      {r && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 text-xs font-semibold">Remboursé si nul (0)</div>
            <Out label="Mise sur le nul" value={formatEur(r.dnb.drawStake)} /><Out label="Cote équivalente" value={r.dnb.odds.toFixed(3)} strong /><Out label="Mise totale" value={formatEur(r.dnb.total)} /></div>
          <div><div className="mb-1 text-xs font-semibold">+0,5</div>
            <Out label="Mise sur le nul" value={formatEur(r.plusHalf.drawStake)} /><Out label="Cote équivalente" value={r.plusHalf.odds.toFixed(3)} strong /><Out label="Mise totale" value={formatEur(r.plusHalf.total)} /></div>
        </div>
      )}
    </Card>
  )
}

function ValueStake() {
  const { settings } = useSettings()
  const [offered, setOffered] = useState('2.39'), [fair, setFair] = useState('2.2')
  const o = num(offered), f = num(fair)
  const r = ok(o, f) && o > 1 && f > 1 ? valueStake(o, f, settings.bankroll, settings.stake_exponent) : null
  return (
    <Card title="Mise selon la value" sub={`Bankroll ${formatEur(settings.bankroll, { decimals: 0 })}, exposant ${settings.stake_exponent} (modifiables dans Réglages).`}>
      <div className="grid grid-cols-2 gap-2"><In label="Cote proposée" value={offered} onChange={setOffered} /><In label="Cote réelle (modèle)" value={fair} onChange={setFair} /></div>
      {r && (
        <div>
          <Out label="Value" value={<span className={r.value > 0 ? 'text-win' : r.value < 0 ? 'text-loss' : ''}>{formatPct(r.value, { signed: true, decimals: 2 })}</span>} />
          <Out label="Facteur (2 × cote réelle^exposant)" value={r.factor.toFixed(4)} />
          <Out label="Gain visé" value={formatEur(r.targetGain)} />
          <Out label="Mise conseillée" value={r.stake > 0 ? formatEur(r.stake) : 'pas de value'} strong />
        </div>
      )}
    </Card>
  )
}

function LiveHedge() {
  const [stake, setStake] = useState('90'), [odds, setOdds] = useState('1.574'), [hedge, setHedge] = useState('10')
  const s = num(stake), o = num(odds), h = num(hedge)
  const r = ok(s, o, h) && s > 0 && o > 1 && h > 1 ? liveHedge(s, o, h) : null
  return (
    <Card title="Couverture en live" sub="Assurer un pari en cours avec une cote de couverture.">
      <div className="grid grid-cols-3 gap-2">
        <In label="Mise initiale" value={stake} onChange={setStake} suffix="€" /><In label="Cote" value={odds} onChange={setOdds} /><In label="Cote couverture" value={hedge} onChange={setHedge} />
      </div>
      {r && (
        <>
          <div><Out label="Gain si le pari passe" value={formatEur(r.ret)} /><Out label="Bénéfice sans couverture" value={formatEur(r.profit, { signed: true })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><div className="mb-1 text-xs font-semibold">Rembourser la mise</div>
              <Out label="Mise de couverture" value={formatEur(r.refund.stake)} strong /><Out label="Bénéfice net" value={formatEur(r.refund.profit, { signed: true })} /><Out label="Mise totale" value={formatEur(r.refund.total)} /><Out label="Cote équivalente" value={`@${r.refund.odds.toFixed(2)}`} /></div>
            <div><div className="mb-1 text-xs font-semibold">Double chance</div>
              <Out label="Mise de couverture" value={formatEur(r.doubleChance.stake)} strong /><Out label="Bénéfice net" value={formatEur(r.doubleChance.profit, { signed: true })} /><Out label="Mise totale" value={formatEur(r.doubleChance.total)} /><Out label="Cote équivalente" value={`@${r.doubleChance.odds.toFixed(2)}`} /></div>
          </div>
        </>
      )}
    </Card>
  )
}

function EloOdds() {
  const [gap, setGap] = useState('144')
  const [prob, setProb] = useState('60')
  const g = num(gap), pr = num(prob) / 100
  const p = Number.isFinite(g) ? gapToProb(g) : null
  return (
    <Card title="Elo → cote" sub="Écart d'Elo vers probabilité et cotes justes, et l'inverse.">
      <div className="grid grid-cols-2 gap-2"><In label="Écart d'Elo (A − B)" value={gap} onChange={setGap} /><In label="Ou probabilité de A" value={prob} onChange={setProb} suffix="%" /></div>
      {p != null && (
        <div>
          <Out label="Probabilité de A" value={formatPct(p, { decimals: 2 })} />
          <Out label="Cote juste A" value={(1 / p).toFixed(3)} strong />
          <Out label="Cote juste B" value={otherSide(1 / p).toFixed(3)} strong />
        </div>
      )}
      {pr > 0 && pr < 1 && <Out label={`Écart d'Elo pour ${formatPct(pr, { decimals: 1 })}`} value={`${probToGap(pr) > 0 ? '+' : ''}${probToGap(pr).toFixed(1)}`} />}
    </Card>
  )
}

export function CalculatorsPage() {
  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      <EloCalculator ratings={[]} defaultMode="manual" />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DrawCover />
        <ValueStake />
        <LiveHedge />
        <EloOdds />
      </div>
      <p className="text-xs text-muted">Depuis le classement ou l'onglet GDM d'une ligue, cliquer une cote du calculateur BO3/BO5 ouvre le formulaire de pari prérempli.</p>
    </main>
  )
}
