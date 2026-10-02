// Clé de matching d'une équipe : ignore un préfixe de région "(LCK) " et la casse,
// pour que "(LCK) KT Rolster" matche "KT Rolster" dans les imports
export function teamKey(name: string): string {
  return name.replace(/^\s*\([^)]*\)\s*/, '').trim().toLowerCase()
}
