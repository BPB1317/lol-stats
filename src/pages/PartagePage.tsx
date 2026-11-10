// Partage & compta : ce que chacun a dans la bankroll commune, et qui doit combien à qui.
import { useState, type FormEvent } from 'react'
import type { Bet, MoneyMove, Person } from '@/types/betting'
import { useComptaLegacy, useMoneyMoves, useSettings, addMoneyMove, deleteMoneyMove } from '@/hooks/useBetting'
import { whoHasWhat, interPersonBalance, squawoShare, resultProfit, isSettled, formatEur, formatPct } from '@/lib/betStats'
import { CumulativeChart } from '@/components/charts/Charts'
import { Signed } from '@/components/bets/BetTable'
import { ResultLabel } from '@/components/bets/ResultButtons'
import { useSession } from '@/lib/session'

const fmtDate = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—')
const today = () => new Date().toISOString().slice(0, 10)

function MoveForm() {
  const { person } = useSession()
  const [kind, setKind] = useState<'Retrait' | 'Dépôt'>('Retrait')
  const [who, setWho] = useState<Person | 'Les deux'>(person ?? 'Squawo')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const a = parseFloat(amount.replace(',', '.'))
    if (!(a > 0)) return setError('Montant > 0')
    setError('')
    const err = await addMoneyMove({ move_date: date, kind, person: who, amount: a, portfolio: 'commun', note: note.trim() || null })
    if (!err) { setAmount(''); setNote('') }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="flex gap-1">{(['Retrait', 'Dépôt'] as const).map(k => <button key={k} type="button" data-on={kind === k} onClick={() => setKind(k)} className="pill px-3 py-2 text-xs">{k}</button>)}</div>
      <div className="flex gap-1">{(['Squawo', 'Kelicful', 'Les deux'] as const).map(p => <button key={p} type="button" data-on={who === p} onClick={() => setWho(p)} className="pill px-3 py-2 text-xs">{p}</button>)}</div>
      <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="Montant €" className="field w-28 px-2 py-2 font-mono text-sm" aria-label="Montant" />
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field px-2 py-2 font-mono text-sm" aria-label="Date" />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (facultatif)" className="field min-w-0 flex-1 px-2 py-2 text-sm" aria-label="Note" />
      <button type="submit" className="btn-primary px-3 py-2 text-sm">Enregistrer</button>
      {error && <span className="w-full text-xs text-loss">{error}</span>}
    </form>
  )
}

function SettleForm({ payer, amount, onDone }: { payer: Person; amount: number; onDone: () => void }) {
  const [who, setWho] = useState<Person>(payer)
  const [value, setValue] = useState(amount.toFixed(2))
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const to = who === 'Squawo' ? 'Kelicful' : 'Squawo'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const a = parseFloat(value.replace(',', '.'))
    if (!(a > 0)) return
    const err = await addMoneyMove({ move_date: date, kind: 'Règlement', person: who, amount: a, portfolio: 'commun', note: note.trim() || null })
    if (!err) onDone()
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-line bg-stripe p-3">
      <div className="flex gap-1">{(['Kelicful', 'Squawo'] as const).map(p => <button key={p} type="button" data-on={who === p} onClick={() => setWho(p)} className="pill px-3 py-2 text-xs">{p} paie</button>)}</div>
      <span className="pb-2 text-xs text-muted">à {to}</span>
      <input value={value} onChange={e => setValue(e.target.value)} inputMode="decimal" className="field w-28 px-2 py-2 font-mono text-sm" aria-label="Montant du règlement" />
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field px-2 py-2 font-mono text-sm" aria-label="Date" />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (virement, espèces…)" className="field min-w-0 flex-1 px-2 py-2 text-sm" />
      <button type="submit" className="btn-primary px-3 py-2 text-sm">Enregistrer le règlement</button>
      <button type="button" onClick={onDone} className="px-2 py-2 text-xs text-muted hover:text-ink">Annuler</button>
    </form>
  )
}

export function PartagePage({ bets, loading }: { bets: Bet[]; loading: boolean }) {
  const { moves, loading: movesLoading } = useMoneyMoves()
  const { rows: legacy } = useComptaLegacy()
  const { settings } = useSettings()
  const [year, setYear] = useState('Toutes')
  const [showLegacy, setShowLegacy] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [settling, setSettling] = useState(false)

  if (loading || movesLoading) return <div className="py-16 text-center text-muted">Chargement…</div>

  const share = settings.default_share_squawo
  const inYear = (d: string) => year === 'Toutes' || d.startsWith(year)
  const communBets = bets.filter(b => b.portfolio === 'commun' && b.status === 'Pris')
  const communMoves = moves.filter(m => m.portfolio === 'commun')
  const years = [...new Set([...communBets.map(b => b.bet_date.slice(0, 4)), ...communMoves.map(m => m.move_date.slice(0, 4))])].sort()
  const w = whoHasWhat(communBets.filter(b => inYear(b.bet_date)), communMoves.filter(m => inYear(m.move_date)), share)

  // Évolution de la part de chacun (bénéfice attribué cumulé)
  const events = [
    ...communBets.filter(b => inYear(b.bet_date) && isSettled(b.result)).map(b => ({ date: b.bet_date, s: resultProfit(b) * squawoShare(b, share), k: resultProfit(b) * (1 - squawoShare(b, share)) })),
    ...communMoves.filter(m => inYear(m.move_date) && m.kind === 'Ajustement').map(m => ({ date: m.move_date, s: Number(m.amount) * share / 100, k: Number(m.amount) * (1 - share / 100) })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  let cs = 0, ck = 0
  const curveS: { date: string; value: number }[] = [], curveK: { date: string; value: number }[] = []
  for (const e of events) { cs += e.s; ck += e.k; curveS.push({ date: e.date, value: cs }); curveK.push({ date: e.date, value: ck }) }

  const compta = interPersonBalance(bets, settings.compta_legacy_balance, moves)
  const owed = Math.abs(compta.balance)
  const legacySum = legacy.reduce((s, r) => s + Number(r.pl ?? 0) * (r.paid_by === 'Squawo' ? -1 : 1), 0)

  const people = [
    { name: 'Squawo', ...w.squawo, pct: share, curve: curveS },
    { name: 'Kelicful', ...w.kelicful, pct: 100 - share, curve: curveK },
  ]
  const movesList = communMoves.filter(m => inYear(m.move_date)).sort((a, b) => b.move_date.localeCompare(a.move_date))

  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {['Toutes', ...years].map(y => <button key={y} data-on={year === y} onClick={() => setYear(y)} className="pill shrink-0 px-3 py-1.5 font-mono text-xs">{y}</button>)}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {people.map(p => (
          <div key={p.name} className="panel p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{p.name}</h2>
              <span className="font-mono text-xs text-muted">part par défaut {formatPct(p.pct / 100, { decimals: 0 })}</span>
            </div>
            <div className="mt-2 text-xs text-muted">Reste dû dans la bankroll commune</div>
            <div className="text-[28px] font-semibold leading-tight"><Signed v={p.remaining} /></div>
            <dl className="mt-2 grid grid-cols-3 gap-2 font-mono text-[13px]">
              <div><dt className="font-sans text-xs text-muted">Bénéfice attribué</dt><dd><Signed v={p.earned} /></dd></div>
              <div><dt className="font-sans text-xs text-muted">Retraits</dt><dd>{p.withdrawn ? `−${formatEur(p.withdrawn).replace('−', '')}` : formatEur(0)}</dd></div>
              <div><dt className="font-sans text-xs text-muted">Dépôts</dt><dd>{formatEur(p.deposited)}</dd></div>
            </dl>
            {p.curve.length > 1 && <div className="mt-3"><CumulativeChart points={p.curve} height={130} /></div>}
          </div>
        ))}
      </section>
      <p className="text-xs text-muted">Bénéfice attribué = Σ bénéfice de chaque pari commun × part de chacun (part du pari si elle est renseignée, sinon {formatPct(share / 100, { decimals: 0 })} pour Squawo), ajustements compris. Reste dû = bénéfice attribué − retraits + dépôts.</p>

      <section className="panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Compta entre nous</h2>
          {owed >= 0.005 && !settling && <button onClick={() => setSettling(true)} className="btn-ghost px-3 py-1.5 text-xs">Régler</button>}
        </div>
        <p className="mt-2 text-xl font-semibold">
          {owed < 0.005 ? 'Vous êtes quittes.' : compta.balance > 0
            ? <>Kelicful doit <span className="font-mono">{formatEur(owed)}</span> à Squawo</>
            : <>Squawo doit <span className="font-mono">{formatEur(owed)}</span> à Kelicful</>}
        </p>
        <p className="mt-1 text-xs text-muted">
          Solde de l'onglet « Compta Kévin » : <span className="font-mono">{formatEur(settings.compta_legacy_balance)}</span> en faveur de Squawo
          {compta.concerned.length > 0 && <>, puis {compta.concerned.length} pari{compta.concerned.length > 1 ? 's' : ''} placé{compta.concerned.length > 1 ? 's' : ''} par l'un pour l'autre</>}
          {compta.settlements.length > 0 && <> et {compta.settlements.length} règlement{compta.settlements.length > 1 ? 's' : ''}</>}.
          Un pari placé pour l'autre : s'il perd, le bénéficiaire doit la perte à celui qui a misé ; s'il gagne, celui qui a misé doit le gain.
        </p>
        {settling && <SettleForm payer={compta.balance > 0 ? 'Kelicful' : 'Squawo'} amount={owed} onDone={() => setSettling(false)} />}
        {compta.concerned.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead><tr className="border-b border-line text-left text-muted"><th className="py-1.5 font-medium">Date</th><th className="font-medium">Payé par</th><th className="font-medium">Pour</th><th className="font-medium">Pari</th><th className="text-right font-medium">Mise</th><th className="pl-3 font-medium">Résultat</th><th className="text-right font-medium">P/L</th></tr></thead>
              <tbody>
                {[...compta.concerned].sort((a, b) => b.bet_date.localeCompare(a.bet_date)).map(b => (
                  <tr key={b.id} className="border-b border-line">
                    <td className="py-1.5 font-mono text-muted">{fmtDate(b.bet_date)}</td><td>{b.placed_by}</td><td>{b.portfolio === 'kelicful' ? 'Kelicful' : 'Squawo'}</td>
                    <td>{b.selection}</td><td className="text-right font-mono">{formatEur(Number(b.stake))}</td><td className="pl-3"><ResultLabel result={b.result} /></td>
                    <td className="text-right"><Signed v={resultProfit(b)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {legacy.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setShowLegacy(s => !s)} className="text-xs text-muted hover:text-ink">{showLegacy ? '▾' : '▸'} Historique « Compta Kévin » ({legacy.length} lignes, lecture seule)</button>
            {Math.abs(legacySum - settings.compta_legacy_balance) > 0.05 && <span className="ml-2 text-xs text-warn">écart avec le solde enregistré : {formatEur(legacySum - settings.compta_legacy_balance, { signed: true })}</span>}
            {showLegacy && (
              <div className="mt-2 max-h-96 overflow-auto">
                <table className="w-full min-w-[620px] text-[13px]">
                  <thead className="sticky top-0 bg-surface"><tr className="border-b border-line text-left text-muted"><th className="py-1.5 font-medium">Date</th><th className="font-medium">Payé par</th><th className="font-medium">Pour</th><th className="font-medium">Pari</th><th className="text-right font-medium">Cote</th><th className="text-right font-medium">Montant</th><th className="pl-3 font-medium">Résultat</th><th className="text-right font-medium">P/L</th><th className="pl-3 font-medium">Commentaire</th></tr></thead>
                  <tbody>
                    {[...legacy].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).map(r => (
                      <tr key={r.id} className="border-b border-line">
                        <td className="py-1.5 font-mono text-muted">{fmtDate(r.date)}</td><td>{r.paid_by}</td><td>{r.paid_for}</td><td>{r.bet}</td>
                        <td className="text-right font-mono">{r.odds ? Number(r.odds).toFixed(2) : '—'}</td><td className="text-right font-mono">{r.amount != null ? formatEur(Number(r.amount)) : '—'}</td>
                        <td className="pl-3 text-muted">{r.result}</td><td className="text-right">{r.pl != null ? <Signed v={Number(r.pl)} /> : '—'}</td><td className="pl-3 text-muted">{r.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Retraits, dépôts et règlements</h2>
        <MoveForm />
        <ul className="mt-3 divide-y divide-line border-t border-line text-[13px]">
          {movesList.map((m: MoneyMove) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-20 font-mono text-muted">{fmtDate(m.move_date)}</span>
              <span className={m.kind === 'Ajustement' ? 'text-muted' : ''}>{m.kind}</span>
              <span>{m.kind === 'Règlement' ? `${m.person} → ${m.person === 'Squawo' ? 'Kelicful' : 'Squawo'}` : m.person}</span>
              <span className="font-mono">{m.kind === 'Retrait' ? '−' : m.kind === 'Dépôt' ? '+' : m.kind === 'Règlement' ? '' : Number(m.amount) >= 0 ? '+' : '−'}{formatEur(Math.abs(Number(m.amount)))}</span>
              {m.note && <span className="text-muted">{m.note}</span>}
              <span className="ml-auto">
                {m.source === 'import_excel' ? <span className="text-xs text-faint">importé</span> : confirmDel === m.id ? (
                  <>
                    <button onClick={async () => { await deleteMoneyMove(m.id); setConfirmDel(null) }} className="rounded bg-danger px-2 py-1 text-xs text-ink">Supprimer</button>
                    <button onClick={() => setConfirmDel(null)} className="px-2 py-1 text-xs text-muted">Non</button>
                  </>
                ) : <button onClick={() => setConfirmDel(m.id)} className="px-2 py-1 text-xs text-faint hover:text-loss">Supprimer</button>}
              </span>
            </li>
          ))}
          {!movesList.length && <li className="py-4 text-center text-muted">Aucun mouvement sur cette période.</li>}
        </ul>
      </section>
    </main>
  )
}
