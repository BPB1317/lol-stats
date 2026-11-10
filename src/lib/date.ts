// Date du jour à l'heure locale (Paris) : un pari saisi à 1 h du matin doit être daté du jour même, pas de la veille (UTC)
export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
