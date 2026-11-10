// Apparence : style (suisse | terminal) × mode (clair | sombre), posés sur <html data-style data-mode>.
// Mémorisés dans le navigateur (affichage immédiat) et dans le profil de l'utilisateur (user_prefs).
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type UiStyle = 'suisse' | 'terminal'
export type UiMode = 'clair' | 'sombre'

const html = () => document.documentElement
export const currentStyle = (): UiStyle => (html().dataset.style === 'terminal' ? 'terminal' : 'suisse')
export const currentMode = (): UiMode => (html().dataset.mode === 'sombre' ? 'sombre' : 'clair')

const listeners = new Set<() => void>()
function apply(style: UiStyle, mode: UiMode) {
  html().dataset.style = style
  html().dataset.mode = mode
  try { localStorage.setItem('sk-style', style); localStorage.setItem('sk-mode', mode) } catch { /* stockage indisponible */ }
  listeners.forEach(l => l())
}

/** Réglages d'apparence de l'utilisateur connecté, synchronisés avec son profil. */
export function useAppearance(userId?: string) {
  const [state, setState] = useState({ style: currentStyle(), mode: currentMode() })
  useEffect(() => {
    const on = () => setState({ style: currentStyle(), mode: currentMode() })
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  // À la connexion : reprendre les choix enregistrés dans le profil (s'il y en a)
  useEffect(() => {
    if (!userId) return
    supabase.from('user_prefs').select('ui_style,ui_mode').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (error || !data) return
      const st = data.ui_style === 'terminal' || data.ui_style === 'suisse' ? data.ui_style : currentStyle()
      const md = data.ui_mode === 'clair' || data.ui_mode === 'sombre' ? data.ui_mode : currentMode()
      if (st !== currentStyle() || md !== currentMode()) apply(st, md)
    })
  }, [userId])
  const save = (style: UiStyle, mode: UiMode) => {
    apply(style, mode)
    // Profil : sans effet tant que la migration 05 n'est pas passée (le navigateur garde le choix)
    if (userId) supabase.from('user_prefs').upsert({ user_id: userId, ui_style: style, ui_mode: mode }).then(() => {})
  }
  return { ...state, setStyle: (s: UiStyle) => save(s, state.mode), setMode: (m: UiMode) => save(state.style, m) }
}
