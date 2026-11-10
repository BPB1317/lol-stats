// Bascule clair / sombre (lune = passer en sombre, soleil = passer en clair), mémorisée dans le navigateur
import { useState } from 'react'

type Theme = 'light' | 'dark'
const current = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(current)
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('bpb-theme', next) } catch { /* stockage indisponible */ }
    setTheme(next)
  }
  const label = theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'
  return (
    <button onClick={toggle} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted hover:bg-raised hover:text-ink">
      {theme === 'dark' ? (
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></g></svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
      )}
    </button>
  )
}
