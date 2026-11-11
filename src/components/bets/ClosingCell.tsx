// Cote de clôture modifiable sur place : un clic sur la case (vide ou non), on tape, Entrée ou clic ailleurs enregistre.
// Échap annule ; une case vidée efface la clôture. Le CLV est recalculé à l'enregistrement.
import { useState } from 'react'
import type { Bet } from '@/types/betting'
import { updateBet } from '@/hooks/useBetting'

export function ClosingCell({ bet, className = '', emptyLabel = '—' }: { bet: Bet; className?: string; emptyLabel?: string }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState('')
  const current = bet.closing_odds != null ? Number(bet.closing_odds) : null

  const open = () => { setV(current != null ? String(current) : ''); setEditing(true) }
  const commit = async () => {
    setEditing(false)
    const t = v.trim()
    const c = t ? parseFloat(t.replace(',', '.')) : null
    if (c != null && !(c > 1)) return              // saisie invalide : on ne touche à rien
    if (c === current) return
    await updateBet(bet.id, { closing_odds: c }, bet)
  }

  if (editing) {
    return (
      <input autoFocus inputMode="decimal" value={v} onChange={e => setV(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(false) }}
        placeholder={Number(bet.odds).toFixed(2)} aria-label={`Cote de clôture de ${bet.selection}`}
        className={`field w-[4.5rem] px-1.5 py-0.5 text-right font-mono text-[13px] ${className}`} />
    )
  }
  return (
    <button type="button" onClick={open} title="Cliquer pour saisir la cote de clôture"
      className={`min-w-[3.5rem] border border-dashed px-1.5 py-0.5 text-right font-mono ${current != null ? 'border-transparent text-muted hover:border-line' : 'border-line text-faint hover:border-ink hover:text-ink'} ${className}`}>
      {current != null ? current.toFixed(2) : emptyLabel}
    </button>
  )
}
