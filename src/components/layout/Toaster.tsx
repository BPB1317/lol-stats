import { useEffect, useState } from 'react'
import { subscribeToasts, dismissToast, type Toast } from '@/lib/toast'

export function Toaster() {
  const [list, setList] = useState<Toast[]>([])
  useEffect(() => subscribeToasts(setList), [])
  if (!list.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
      {list.map(t => (
        <div key={t.id} className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-lg ${t.kind === 'error' ? 'border-loss bg-surface text-ink' : 'border-line bg-raised text-ink'}`}>
          <span className={t.kind === 'error' ? 'text-loss' : 'text-win'}>{t.kind === 'error' ? '!' : '✓'}</span>
          <span className="min-w-0 flex-1">{t.text}</span>
          {t.retry && <button onClick={() => { dismissToast(t.id); t.retry?.() }} className="btn-primary px-2.5 py-1 text-xs">Réessayer</button>}
          <button onClick={() => dismissToast(t.id)} className="text-muted hover:text-ink" aria-label="Fermer">✕</button>
        </div>
      ))}
    </div>
  )
}
