import { format } from 'date-fns'

interface RatingControlsProps {
  sinceDate: string
  sensitivity: number
  onSinceDateChange: (date: string) => void
  onSensitivityChange: (value: number) => void
}

export function RatingControls({
  sinceDate,
  sensitivity,
  onSinceDateChange,
  onSensitivityChange,
}: RatingControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
          Since
        </label>
        <input
          type="date"
          value={sinceDate}
          onChange={e => { if (e.target.value) onSinceDateChange(e.target.value) }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink outline-none focus:ring-2"
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-line)',
          }}
        />
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
        <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
          Sensibilité (ELO)
        </label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={sensitivity}
          onChange={e => onSensitivityChange(parseInt(e.target.value))}
          className="flex-1 accent-accent"
        />
        <input
          type="number"
          min="10"
          max="500"
          step="1"
          value={sensitivity}
          onChange={e => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v > 0) onSensitivityChange(Math.min(500, v))
          }}
          className="w-16 rounded-lg px-2 py-1 text-sm text-ink outline-none text-center"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line)' }}
        />
      </div>

      {sinceDate && (
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Données depuis le {format(new Date(sinceDate + 'T00:00:00'), 'dd/MM/yyyy')}
        </div>
      )}
    </div>
  )
}
