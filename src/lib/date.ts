// Date du jour à l'heure locale (Paris) : un pari saisi à 1 h du matin doit être daté du jour même, pas de la veille (UTC)
export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Date ISO (AAAA-MM-JJ) décalée de n jours, sans passer par l'UTC */
export function addDaysLocal(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
