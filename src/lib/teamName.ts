// Clé de matching d'une équipe, tolérante aux variations de nommage :
// ignore un préfixe de région "(LCK) ", la casse, les accents et la ponctuation.
// Ex: "(LPL) Anyone's Legend" ≡ "Anyone s Legend", "LØS" ≡ "LOS", "Gen.G" ≡ "Gen G"
export function teamKey(name: string): string {
  return name
    .replace(/^\s*\([^)]*\)\s*/, '')
    .toLowerCase()
    .replace(/ø/g, 'o')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
