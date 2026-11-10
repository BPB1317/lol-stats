// Paris supprimés : relus dans l'historique des modifications, restaurables à l'identique
import { useEffect, useState } from 'react'
import type { Bet } from '@/types/betting'
import { fetchDeletedBets, restoreBet } from '@/hooks/useBetting'
import { formatEur } from '@/lib/betStats'

export function DeletedBets({ bets }: { bets: Bet[] }) {
  const [rows, setRows] = useState<{ id: number; old_row: Bet; changed_at: string }[] | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  useEffect(() => { fetchDeletedBets().then(r => setRows(r.rows)) }, [])
  const present = new Set(bets.map(b => b.id))
  // Un pari déjà restauré (ou recréé avec le même identifiant) n'est plus proposé
  const list = (rows ?? []).filter(r => r.old_row && !present.has(r.old_row.id))
  if (rows == null) return <p className="text-sm text-muted">Chargement…</p>
  if (!list.length) return <p className="text-sm text-muted">Aucun pari supprimé.</p>
  return (
    <ul className="divide-y divide-line text-[13px]">
      {list.map(r => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
          <span className="font-mono text-muted">{r.old_row.bet_date.split('-').reverse().join('/')}</span>
          <span className="font-medium">{r.old_row.selection}</span>
          <span className="font-mono text-muted">{formatEur(Number(r.old_row.stake))} @ {Number(r.old_row.odds).toFixed(2)}</span>
          <span className="text-xs text-faint">supprimé le {new Date(r.changed_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
          <button disabled={busy === r.id} onClick={async () => { setBusy(r.id); await restoreBet(r.old_row); setBusy(null) }} className="btn-ghost ml-auto px-2.5 py-1 text-xs disabled:opacity-50">Restaurer</button>
        </li>
      ))}
    </ul>
  )
}
