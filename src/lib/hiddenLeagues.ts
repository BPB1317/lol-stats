// Ligues masquées du menu : préférence locale au navigateur (même clé que l'ancienne barre d'onglets)
const KEY = 'lol-hidden-leagues'

export function loadHiddenLeagues(): Set<string> {
  try {
    const s = localStorage.getItem(KEY)
    return new Set(s ? JSON.parse(s) : [])
  } catch { return new Set() }
}

export function saveHiddenLeagues(ids: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...ids])) } catch { /* stockage indisponible */ }
}
