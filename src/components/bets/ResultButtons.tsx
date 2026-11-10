// Résultat en un clic : Gagnant, Perdant, ½ G, ½ P, Remboursé
import type { BetResult } from '@/types/betting'

const OPTIONS: { r: BetResult; label: string; tone: 'win' | 'loss' | 'neutral' }[] = [
  { r: 'Gagnant', label: 'Gagnant', tone: 'win' },
  { r: 'Perdant', label: 'Perdant', tone: 'loss' },
  { r: '1/2 Gagnant', label: '½ G', tone: 'win' },
  { r: '1/2 Perdant', label: '½ P', tone: 'loss' },
  { r: 'Remboursé', label: 'Remb.', tone: 'neutral' },
]

export function ResultButtons({ onPick, disabled }: { onPick: (r: BetResult) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-5 overflow-hidden rounded-md border border-line text-xs">
      {OPTIONS.map((o, i) => (
        <button key={o.r} type="button" title={o.r} disabled={disabled} onClick={() => onPick(o.r)}
          className={`py-2 text-muted hover:bg-raised disabled:opacity-40 ${i ? 'border-l border-line' : ''} ${o.tone === 'win' ? 'hover:text-win' : o.tone === 'loss' ? 'hover:text-loss' : 'hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ResultLabel({ result }: { result: BetResult }) {
  const won = result === 'Gagnant' || result === '1/2 Gagnant'
  const lost = result === 'Perdant' || result === '1/2 Perdant'
  return <span className={`whitespace-nowrap text-xs ${won ? 'text-win' : lost ? 'text-loss' : 'text-muted'}`}>{won ? '▲ ' : lost ? '▼ ' : '○ '}{result}</span>
}
