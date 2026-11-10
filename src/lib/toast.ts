// Notifications : confirmation discrète d'enregistrement, et erreurs jamais silencieuses (avec « Réessayer »)
export interface Toast { id: number; kind: 'ok' | 'error'; text: string; retry?: () => void }

let seq = 0
let toasts: Toast[] = []
const listeners = new Set<(t: Toast[]) => void>()
const emit = () => listeners.forEach(l => l(toasts))

export function subscribeToasts(l: (t: Toast[]) => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id); emit()
}

export function notify(kind: Toast['kind'], text: string, retry?: () => void) {
  const t = { id: ++seq, kind, text, retry }
  toasts = [...toasts.slice(-3), t]; emit()
  // Les erreurs restent affichées jusqu'à ce qu'on les ferme ou qu'on réessaie
  if (kind === 'ok') setTimeout(() => dismissToast(t.id), 2500)
}
