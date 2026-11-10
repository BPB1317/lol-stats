// « Vu pas pris » : paris repérés mais pas joués. Bilan théorique à part, jamais dans les bilans réels.
import { useState } from 'react'
import type { Bet } from '@/types/betting'
import { theoreticalSummary, formatEur, formatPct } from '@/lib/betStats'
import { updateBet, setBetResult } from '@/hooks/useBetting'
import { BetTable, Signed } from '@/components/bets/BetTable'
import { ResultButtons } from '@/components/bets/ResultButtons'

export function VuPasPrisPage({ bets, loading }: { bets: Bet[]; loading: boolean }) {
  const [mode, setMode] = useState<'reelle' | 'fixe'>('reelle')
  const [fixed, setFixed] = useState('10')

  if (loading) return <div className="py-16 text-center text-muted">Chargement…</div>

  const seen = bets.filter(b => b.status === 'Vu pas pris')
  const open = seen.filter(b => b.result === 'En cours')
  const fixedStake = parseFloat(fixed.replace(',', '.'))
  const t = theoreticalSummary(seen, mode === 'fixe' && fixedStake > 0 ? fixedStake : undefined)

  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      <p className="text-sm text-muted">Ces paris n'entrent dans aucun bilan réel. Leur bilan théorique permet de comparer avec ce qu'on a joué.</p>
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        {[
          ['Paris réglés', <span className="font-mono">{t.count}</span>, `${open.length} en cours`],
          ['Bénéfice théorique', <Signed v={t.profit} />, mode === 'fixe' ? `à ${formatEur(fixedStake || 0, { decimals: 0 })} par pari` : 'à mise réelle'],
          ['ROI théorique', <span className="font-mono">{formatPct(t.roi, { signed: true })}</span>, `${formatEur(t.staked, { decimals: 0 })} misés`],
          ['Mode de calcul', (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button data-on={mode === 'reelle'} onClick={() => setMode('reelle')} className="pill px-2.5 py-1 text-xs">Mise réelle</button>
              <button data-on={mode === 'fixe'} onClick={() => setMode('fixe')} className="pill px-2.5 py-1 text-xs">Mise fixe</button>
              {mode === 'fixe' && <input inputMode="decimal" value={fixed} onChange={e => setFixed(e.target.value)} className="field w-16 px-2 py-1 font-mono text-xs" aria-label="Mise fixe en euros" />}
            </div>
          ), ''],
        ].map(([l, v, s], i) => (
          <div key={i} className="bg-surface px-4 py-3.5">
            <div className="text-xs text-muted">{l}</div>
            <div className="mt-1 text-[22px] font-semibold leading-tight">{v}</div>
            {s && <div className="text-[11px] text-muted">{s}</div>}
          </div>
        ))}
      </section>

      {open.length > 0 && (
        <section className="panel overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">En cours <span className="font-normal text-muted">· {open.length}</span></h2>
          {open.map(b => (
            <div key={b.id} className="border-b border-line px-4 py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0"><div className="truncate text-sm font-medium">{b.selection}</div><div className="truncate text-xs text-muted">{b.game}</div></div>
                <div className="shrink-0 font-mono text-sm">{Number(b.odds).toFixed(2)}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="min-w-[260px] flex-1 md:max-w-md"><ResultButtons onPick={r => setBetResult(b, r)} /></div>
                <button onClick={() => updateBet(b.id, { status: 'Pris' }, b)} className="btn-ghost px-3 py-2 text-xs">Je l'ai pris</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <BetTable bets={seen} theoretical filename="vu-pas-pris"
        rowAction={b => <button onClick={() => updateBet(b.id, { status: 'Pris' }, b)} className="rounded px-1.5 py-1 text-xs text-faint hover:bg-raised hover:text-ink">Je l'ai pris</button>} />
    </main>
  )
}
