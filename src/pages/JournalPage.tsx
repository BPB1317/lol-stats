// Journal des paris : paris en cours (résultat en un clic, puis cote de clôture facultative) et historique.
import { useState } from 'react'
import type { Bet, BetResult, Portfolio } from '@/types/betting'
import { setBetResult, updateBet } from '@/hooks/useBetting'
import { formatEur, formatPct, clvRatio } from '@/lib/betStats'
import { BetTable } from '@/components/bets/BetTable'
import { ResultButtons, ResultLabel } from '@/components/bets/ResultButtons'
import { QuickAdd } from '@/components/bets/QuickAdd'

type Filter = 'tous' | Portfolio

function ClosingPrompt({ bet, onDone }: { bet: Bet; onDone: () => void }) {
  const [v, setV] = useState('')
  const c = parseFloat(v.replace(',', '.'))
  const clv = clvRatio(Number(bet.odds), c)
  const save = async () => {
    if (c > 1) await updateBet(bet.id, { closing_odds: c }, bet)
    onDone()
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <div className="truncate text-sm font-medium">{bet.selection} <ResultLabel result={bet.result} /></div>
        <div className="text-xs text-muted">Cote de clôture (facultatif) pour calculer le CLV</div>
      </div>
      <input autoFocus inputMode="decimal" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder={Number(bet.odds).toFixed(2)} className="field w-24 px-2 py-1.5 font-mono text-sm" />
      {clv != null && <span className={`font-mono text-xs ${clv > 0 ? 'text-win' : clv < 0 ? 'text-loss' : 'text-muted'}`}>CLV {formatPct(clv, { signed: true })}</span>}
      <button onClick={save} className="btn-primary px-3 py-1.5 text-xs">OK</button>
      <button onClick={onDone} className="px-2 py-1.5 text-xs text-muted hover:text-ink">Passer</button>
    </div>
  )
}

export function JournalPage({ bets, loading }: { bets: Bet[]; loading: boolean }) {
  const [filter, setFilter] = useState<Filter>('tous')
  const [busy, setBusy] = useState<string | null>(null)
  const [justSettled, setJustSettled] = useState<string[]>([])

  if (loading) return <div className="py-16 text-center text-muted">Chargement…</div>

  const taken = bets.filter(b => b.status === 'Pris' && (filter === 'tous' || b.portfolio === filter))
  const open = taken.filter(b => b.result === 'En cours').sort((a, b) => a.bet_date.localeCompare(b.bet_date))
  const engaged = (p: string) => open.filter(b => (b.placed_by ?? 'Non renseigné') === p).reduce((s, b) => s + Number(b.stake), 0)
  const placers = [...new Set(open.map(b => b.placed_by ?? 'Non renseigné'))]
  const settledNow = justSettled.map(id => bets.find(b => b.id === id)).filter((b): b is Bet => !!b && b.result !== 'En cours' && b.closing_odds == null)

  const pick = async (b: Bet, r: BetResult) => {
    setBusy(b.id)
    const err = await setBetResult(b, r)
    setBusy(null)
    if (!err && b.closing_odds == null) setJustSettled(s => [...s, b.id])
  }

  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      <QuickAdd />
      <div className="flex flex-wrap gap-1.5">
        {(['tous', 'commun', 'kelicful'] as const).map(f => (
          <button key={f} data-on={filter === f} onClick={() => setFilter(f)} className="pill px-3 py-1.5 text-xs">{f === 'tous' ? 'Tous' : f === 'commun' ? 'Commun' : 'Kelicful'}</button>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">En cours <span className="font-normal text-muted">· {open.length}</span></h2>
          <span className="font-mono text-xs text-muted">
            {placers.length ? placers.map(p => `${p} ${formatEur(engaged(p), { decimals: 0 })}`).join(' · ') : 'Aucune mise engagée'}
          </span>
        </div>
        {settledNow.map(b => <ClosingPrompt key={b.id} bet={b} onDone={() => setJustSettled(s => s.filter(x => x !== b.id))} />)}
        {open.map(b => (
          <div key={b.id} className="border-b border-line px-4 py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{b.selection}</div>
                <div className="truncate text-xs text-muted">{b.game ? `${b.game} · ` : ''}{b.bet_date.split('-').reverse().join('/')} · {b.portfolio === 'commun' ? 'Commun' : 'Kelicful'}{b.placed_by ? ` · ${b.placed_by}` : ''}</div>
              </div>
              <div className="shrink-0 text-right font-mono text-sm"><span className="font-semibold">{Number(b.odds).toFixed(2)}</span> <span className="text-muted">· {formatEur(Number(b.stake), { decimals: 0 })}</span></div>
            </div>
            <div className="mt-2 md:max-w-md"><ResultButtons disabled={busy === b.id} onPick={r => pick(b, r)} /></div>
          </div>
        ))}
        {!open.length && !settledNow.length && <div className="px-4 py-6 text-center text-sm text-muted">Aucun pari en cours.</div>}
      </section>

      <BetTable bets={taken} filename="journal" showPortfolio={filter === 'tous'} />
    </main>
  )
}
