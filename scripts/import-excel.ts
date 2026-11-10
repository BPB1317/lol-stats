// Import unique de l'historique Excel « LoL_2026 » dans Supabase (script local, jamais exécuté par le site).
//
//   npm run import:excel -- "C:/chemin/LoL 2026.xlsx" --dry-run    → rapport de contrôle, aucune écriture
//   npm run import:excel -- "C:/chemin/LoL 2026.xlsx"              → import (refusé si un import existe déjà)
//
// La clé secrète est lue dans .env.local (SUPABASE_URL, SUPABASE_SERVICE_KEY), jamais dans le code.
// Les calculs (bénéfice, sport, marché) sont ceux du site (src/lib/betStats.ts).
import ExcelJS from 'exceljs'
import { existsSync, readFileSync } from 'node:fs'
import { inferMarket, inferSport, resultProfit, isSettled } from '../src/lib/betStats'
import { teamKey } from '../src/lib/teamName'
import type { BetResult, ClvMethod } from '../src/types/betting'

// ── Paramètres ─────────────────────────────────────────────────────

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const FILE = args.find(a => !a.startsWith('--'))
if (!FILE || !existsSync(FILE)) { console.error('Usage : npm run import:excel -- "<chemin du fichier .xlsx>" [--dry-run]'); process.exit(1) }

function loadEnv() {
  if (!existsSync('.env.local')) return {}
  return Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const env = { ...loadEnv(), ...process.env } as Record<string, string | undefined>
const URL = env.SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_KEY
if (!URL || !KEY) { console.error('SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans .env.local'); process.exit(1) }
const H: Record<string, string> = KEY.startsWith('sb_') ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...H, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} : HTTP ${r.status} ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}

// ── Lecture des cellules ───────────────────────────────────────────

type Cell = ExcelJS.CellValue
function val(v: Cell): string | number | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('error' in v) return null
    if ('result' in v) return val(v.result as Cell)
    if ('richText' in v) return v.richText.map(t => t.text).join('')
    if ('text' in v) return String(v.text)
    return null
  }
  if (typeof v === 'string') { const s = v.trim(); return s === '' || s === '?' ? null : s }
  return v as number
}
const num = (v: string | number | null) => (v == null ? null : typeof v === 'number' ? v : Number.isFinite(parseFloat(v.replace(',', '.'))) ? parseFloat(v.replace(',', '.')) : null)
const str = (v: string | number | null) => (v == null ? null : String(v).trim() || null)
function date(v: string | number | null): string | null {
  if (v == null) return null
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10) // numéro de série Excel
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? v.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`
}

const RESULTS: Record<string, BetResult> = { 'gagnant': 'Gagnant', 'perdant': 'Perdant', '1/2 gagnant': '1/2 Gagnant', '1/2 perdant': '1/2 Perdant', 'remboursé': 'Remboursé', 'rembourse': 'Remboursé', 'en cours': 'En cours' }

interface Row { tab: string; row: number; date: string | null; bet: string | null; game: string | null; stake: number | null; odds: number | null; closing: number | null; diff: number | null; result: string | null; benefit: number | null }

function readBetTab(wb: ExcelJS.Workbook, tab: string): Row[] {
  const ws = wb.getWorksheet(tab)
  if (!ws) throw new Error(`Onglet introuvable : ${tab}`)
  const rows: Row[] = []
  ws.eachRow((r, n) => {
    if (n === 1) return
    const c = (i: number) => val(r.getCell(i).value)
    const row: Row = { tab, row: n, date: date(c(1)), bet: str(c(2)), game: str(c(3)), stake: num(c(4)), odds: num(c(5)), closing: num(c(6)), diff: num(c(7)), result: str(c(8)), benefit: num(c(9)) }
    if (row.date || row.bet || row.game) rows.push(row)
  })
  return rows
}

const ref = (r: Row) => `${r.tab}!A${r.row}`
const key = (r: Row) => `${r.date}|${(r.bet ?? '').toLowerCase().replace(/\s+/g, ' ')}|${(r.game ?? '').toLowerCase().replace(/\s+/g, ' ')}`

// ── Construction des lignes à importer ─────────────────────────────

const problems: string[] = []
const notes: string[] = []

interface BetRow {
  bet_date: string; game: string | null; selection: string; sport: string; stake: number; odds: number; result: BetResult
  status: 'Pris' | 'Vu pas pris'; portfolio: 'commun' | 'kelicful'; closing_odds: number | null; clv: number | null; clv_method: ClvMethod | null
  market: string; placed_by: 'Squawo' | 'Kelicful' | null; note: string | null; source: 'import_excel'; source_ref: string
}

/** Méthode de CLV reconnue en recalculant les deux formules de l'Excel. */
function clvOf(r: Row, fallback: ClvMethod): { clv: number | null; method: ClvMethod | null } {
  if (r.diff == null) return { clv: null, method: null }
  if (r.odds && r.closing) {
    if (Math.abs(r.diff - (r.odds / r.closing - 1)) < 1e-6) return { clv: r.diff, method: 'ratio' }
    if (Math.abs(r.diff - (r.odds / (r.closing * 1.05) - 1)) < 1e-6) return { clv: r.diff, method: 'legacy_margin5' }
  }
  notes.push(`${ref(r)} : CLV ${r.diff} ne correspond à aucune formule, importé tel quel (méthode ${fallback})`)
  return { clv: r.diff, method: fallback }
}

function toBet(r: Row, o: { portfolio: 'commun' | 'kelicful'; status: 'Pris' | 'Vu pas pris'; sport: string; clvFallback: ClvMethod; placedBy: 'Squawo' | 'Kelicful' | null }): BetRow | null {
  const result = r.result ? RESULTS[r.result.toLowerCase()] : undefined
  const selection = r.bet ?? r.game
  if (!r.date) { problems.push(`${ref(r)} : date illisible`); return null }
  if (!selection) { problems.push(`${ref(r)} : ni pari ni match`); return null }
  if (!(r.stake && r.stake > 0)) { problems.push(`${ref(r)} : mise invalide (${r.stake})`); return null }
  if (!(r.odds && r.odds > 1)) { problems.push(`${ref(r)} : cote invalide (${r.odds})`); return null }
  if (!result) { problems.push(`${ref(r)} : résultat inconnu « ${r.result} »`); return null }
  if (!r.bet) notes.push(`${ref(r)} : colonne Bet vide, le match sert de position`)
  // Le bénéfice de l'Excel doit être celui de la formule du site
  const p = resultProfit({ stake: r.stake, odds: r.odds, result })
  if (r.benefit != null && Math.abs(p - r.benefit) > 0.01) notes.push(`${ref(r)} : bénéfice Excel ${r.benefit} ≠ formule ${p.toFixed(4)}`)
  const { clv, method } = clvOf(r, o.clvFallback)
  return {
    bet_date: r.date, game: r.game, selection, sport: o.sport, stake: r.stake, odds: r.odds, result, status: o.status, portfolio: o.portfolio,
    closing_odds: r.closing && r.closing > 1 ? r.closing : null, clv, clv_method: method, market: inferMarket(selection), placed_by: o.placedBy,
    note: null, source: 'import_excel', source_ref: ref(r),
  }
}

async function main() {
  console.log(`${DRY ? 'Simulation (--dry-run) : rien ne sera écrit.' : 'IMPORT RÉEL.'}\nLecture de ${FILE}…`)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FILE!)

  // Équipes connues (règle e-sport de la détection du sport)
  const teams = await api('teams?select=name') as { name: string }[]
  const teamKeys = new Set(teams.map(t => teamKey(t.name)))

  const bets: BetRow[] = []
  const moves: Record<string, unknown>[] = []
  const control: Record<string, { rows: BetRow[] }> = {}

  // 1. Portefeuille commun : Bilan 2024, 2025, 2026 (lignes « Retrait » → mouvements d'argent)
  for (const [tab, year] of [['Bilan 2024', 2024], ['Bilan 2025', 2025], ['Bilan 2026', 2026]] as const) {
    const rows: BetRow[] = []
    for (const r of readBetTab(wb, tab)) {
      if (r.game && /^retrait/i.test(r.game)) {
        const who = /\bKN\b/i.test(r.game) ? 'Squawo' : /\bKB\b/i.test(r.game) ? 'Kelicful' : null
        if (!who || !r.stake || !r.date) { problems.push(`${ref(r)} : retrait illisible (« ${r.game} », ${r.stake})`); continue }
        moves.push({ move_date: r.date, kind: 'Retrait', person: who, amount: r.stake, portfolio: 'commun', note: r.game, source: 'import_excel', source_ref: ref(r) })
        continue
      }
      const sport = inferSport(r.game ?? '', r.bet ?? '', new Set()) === 'F1' ? 'F1' : 'E-sport'
      const b = toBet(r, { portfolio: 'commun', status: 'Pris', sport, clvFallback: year === 2026 ? 'ratio' : 'legacy_margin5', placedBy: null })
      if (b) rows.push(b)
    }
    control[`commun ${year}`] = { rows }
    bets.push(...rows)
  }

  // 2. Retrait déguisé 2024 : 11 ajustements (269,09 € fin de mois de janvier à octobre, 269,10 € le 2 novembre)
  for (let m = 1; m <= 10; m++) {
    const last = new Date(Date.UTC(2024, m, 0)).toISOString().slice(0, 10)
    moves.push({ move_date: last, kind: 'Ajustement', person: 'Les deux', amount: 269.09, portfolio: 'commun', note: 'Retrait déguisé 2024 (écart suivi dans la cellule « Compta » de Bilan 2024)', source: 'import_excel', source_ref: 'Bilan 2024!Compta' })
  }
  moves.push({ move_date: '2024-11-02', kind: 'Ajustement', person: 'Les deux', amount: 269.10, portfolio: 'commun', note: 'Retrait déguisé 2024 (écart suivi dans la cellule « Compta » de Bilan 2024)', source: 'import_excel', source_ref: 'Bilan 2024!Compta' })

  // 3. Kelicful : sport pris dans l'onglet par sport où la ligne apparaît, sinon règles automatiques
  const sportByKey = new Map<string, string>()
  for (const [tab, sport] of [['Bilan LoL Kelicful 2026', 'E-sport'], ['Bilan Tennis Kelicful 2026', 'Tennis'], ['Bilan foot Kelicful 2026', 'Football'], ['Bilan F1 Kelicful 2026', 'F1']] as const) {
    for (const r of readBetTab(wb, tab)) if (!sportByKey.has(key(r))) sportByKey.set(key(r), sport)
  }
  const kelicfulRefs = new Map<string, BetRow>()
  for (const [tab, year] of [['Bilan Kelicful 2025', 2025], ['Bilan Kelicful 2026', 2026]] as const) {
    const rows: BetRow[] = []
    for (const r of readBetTab(wb, tab)) {
      const sport = sportByKey.get(key(r)) ?? inferSport(r.game ?? '', r.bet ?? '', teamKeys)
      const b = toBet(r, { portfolio: 'kelicful', status: 'Pris', sport, clvFallback: year === 2026 ? 'ratio' : 'legacy_margin5', placedBy: 'Kelicful' })
      if (b) { rows.push(b); if (!kelicfulRefs.has(key(r))) kelicfulRefs.set(key(r), b) }
    }
    control[`kelicful ${year}`] = { rows }
    bets.push(...rows)
  }

  // 4. Onglets qui recoupent le bilan principal : pas de doublon, une note sur la ligne correspondante
  const unmatched: string[] = []
  for (const [tab, label] of [['Bilan Live Kelicful 2026', 'live'], ['Bilan foot "compta" Kelicful 20', 'compta foot']] as const) {
    for (const r of readBetTab(wb, tab)) {
      const b = kelicfulRefs.get(key(r))
      if (b) b.note = b.note ? `${b.note}, ${label}` : label
      else unmatched.push(`${ref(r)} : ${r.date} · ${r.bet} · ${r.game} · ${r.stake} € @ ${r.odds} · ${r.result}`)
    }
  }

  // 5. Vu pas pris LoL 2026 : portefeuille Kelicful, e-sport
  const vpp: BetRow[] = []
  for (const r of readBetTab(wb, 'Vu pas pris LoL 2026')) {
    const b = toBet(r, { portfolio: 'kelicful', status: 'Vu pas pris', sport: 'E-sport', clvFallback: 'ratio', placedBy: null })
    if (b) vpp.push(b)
  }
  bets.push(...vpp)

  // 6. Compta Kévin, tel quel
  const compta: Record<string, unknown>[] = []
  const wsC = wb.getWorksheet('Compta Kévin')!
  wsC.eachRow((r, n) => {
    if (n < 4) return
    const c = (i: number) => val(r.getCell(i).value)
    if (c(1) == null && c(4) == null) return
    compta.push({ paid_by: str(c(1)), paid_for: str(c(2)), date: date(c(3)), bet: str(c(4)), odds: num(c(5)), amount: num(c(6)), result: str(c(7)), pl: num(c(8)), comment: str(c(9)), source_ref: `Compta Kévin!A${n}` })
  })

  // 7. Elo tennis ATP / WTA (colonnes Player, Elo, hElo, cElo, gElo)
  const tennis: Record<string, unknown>[] = []
  for (const [tab, tour] of [['Elo Tennis ATP', 'ATP'], ['Elo Tennis WTA', 'WTA']] as const) {
    const seen = new Set<string>()
    wb.getWorksheet(tab)!.eachRow((r, n) => {
      if (n === 1) return
      const c = (i: number) => val(r.getCell(i).value)
      const player = str(c(1)), elo = num(c(2))
      if (!player || elo == null || seen.has(player)) return
      seen.add(player)
      tennis.push({ tour, player, elo, helo: num(c(3)), celo: num(c(4)), gelo: num(c(5)) })
    })
  }

  // ── Rapport de contrôle ──────────────────────────────────────────
  const sum = (rows: BetRow[]) => {
    const settled = rows.filter(b => isSettled(b.result))
    return {
      n: rows.length, settled: settled.length, refunded: rows.filter(b => b.result === 'Remboursé').length,
      staked: settled.reduce((s, b) => s + b.stake, 0), profit: settled.reduce((s, b) => s + resultProfit(b), 0),
    }
  }
  const adj2024 = moves.filter(m => m.kind === 'Ajustement').reduce((s, m) => s + (m.amount as number), 0)
  const c24 = sum(control['commun 2024'].rows), c25 = sum(control['commun 2025'].rows), c26 = sum(control['commun 2026'].rows)
  const allCommun = sum([...control['commun 2024'].rows, ...control['commun 2025'].rows, ...control['commun 2026'].rows])
  const k25 = sum(control['kelicful 2025'].rows), k26 = sum(control['kelicful 2026'].rows)
  const vppProfit = vpp.filter(b => isSettled(b.result)).reduce((s, b) => s + resultProfit(b), 0)
  const retraits2026 = moves.filter(m => m.kind === 'Retrait' && String(m.move_date).startsWith('2026'))
  const comptaBalance = compta.reduce((s, r) => {
    const pl = (r.pl as number | null) ?? 0
    return s + (r.paid_by === 'Squawo' && r.paid_for === 'Kelicful' ? -pl : r.paid_by === 'Kelicful' && r.paid_for === 'Squawo' ? pl : 0)
  }, 0)

  type Check = { label: string; got: number; want: number; tol: number; fmt?: (n: number) => string }
  const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  const pct = (n: number) => `${(n * 100).toFixed(2)} %`
  const checks: Check[] = [
    { label: 'Commun 2024 — paris', got: c24.n, want: 210, tol: 0 },
    { label: 'Commun 2024 — bénéfice des paris', got: c24.profit, want: 0, tol: 1, fmt: eur },
    { label: 'Commun 2024 — ajustements', got: adj2024, want: 2960, tol: 0.01, fmt: eur },
    { label: 'Commun 2024 — bénéfice avec ajustements', got: c24.profit + adj2024, want: 2960, tol: 1, fmt: eur },
    { label: 'Commun 2024 — ROI', got: (c24.profit + adj2024) / c24.staked, want: 0.071, tol: 0.0015, fmt: pct },
    { label: 'Commun 2025 — paris', got: c25.n, want: 159, tol: 0 },
    { label: 'Commun 2025 — réglés', got: c25.settled, want: 155, tol: 0 },
    { label: 'Commun 2025 — remboursés', got: c25.refunded, want: 4, tol: 0 },
    { label: 'Commun 2025 — bénéfice', got: c25.profit, want: 8592.53, tol: 0.05, fmt: eur },
    { label: 'Commun 2026 — paris', got: c26.n, want: 139, tol: 0 },
    { label: 'Commun 2026 — bénéfice', got: c26.profit, want: 6050.71, tol: 0.05, fmt: eur },
    { label: 'Commun 2026 — retraits (montant)', got: retraits2026.reduce((s, m) => s + (m.amount as number), 0), want: 6039, tol: 0.01, fmt: eur },
    { label: 'Commun 2026 — retraits (lignes)', got: retraits2026.length, want: 8, tol: 0 },
    { label: 'Commun total — paris', got: allCommun.n, want: 508, tol: 0 },
    { label: 'Commun total — misé', got: allCommun.staked, want: 143439, tol: 1, fmt: eur },
    { label: 'Commun total — bénéfice avec ajustements', got: allCommun.profit + adj2024, want: 17603, tol: 1, fmt: eur },
    { label: 'Commun total — ROI', got: (allCommun.profit + adj2024) / allCommun.staked, want: 0.123, tol: 0.0015, fmt: pct },
    { label: 'Kelicful 2026 — paris', got: k26.n, want: 421, tol: 0 },
    { label: 'Kelicful 2026 — bénéfice', got: k26.profit, want: 15, tol: 0.05, fmt: eur },
    { label: 'Kelicful 2025 — paris', got: k25.n, want: 550, tol: 0 },
    { label: 'Kelicful 2025 — bénéfice', got: k25.profit, want: 1675.3, tol: 0.05, fmt: eur },
    { label: 'Vu pas pris LoL 2026 — paris', got: vpp.length, want: 219, tol: 0 },
    { label: 'Vu pas pris LoL 2026 — bénéfice théorique', got: vppProfit, want: 689.37, tol: 0.05, fmt: eur },
    { label: 'Compta legacy — solde', got: comptaBalance, want: 1584.48, tol: 0.05, fmt: eur },
  ]

  console.log('\n══ Rapport de contrôle ══')
  let failed = 0
  for (const c of checks) {
    const okRow = Math.abs(c.got - c.want) <= c.tol + 1e-9
    if (!okRow) failed++
    const f = c.fmt ?? ((n: number) => String(n))
    console.log(`${okRow ? '  OK ' : '  ÉCART'}  ${c.label.padEnd(44)} ${f(c.got).padStart(16)}   attendu ${f(c.want)}${okRow ? '' : `   (écart ${f(c.got - c.want)})`}`)
  }

  const bySport = new Map<string, number>()
  for (const b of [...control['kelicful 2025'].rows, ...control['kelicful 2026'].rows]) bySport.set(b.sport, (bySport.get(b.sport) ?? 0) + 1)
  console.log(`\nÀ importer : ${bets.length} paris (dont ${vpp.length} vu pas pris), ${moves.length} mouvements (retraits + ajustements), ${compta.length} lignes de compta, ${tennis.length} joueurs Elo tennis.`)
  console.log(`Sports Kelicful : ${[...bySport].map(([s, n]) => `${s} ${n}`).join(' · ')}`)
  const methods = new Map<string, number>()
  for (const b of bets) methods.set(String(b.clv_method), (methods.get(String(b.clv_method)) ?? 0) + 1)
  console.log(`Méthodes de CLV : ${[...methods].map(([m, n]) => `${m} ${n}`).join(' · ')}`)

  if (notes.length) { console.log(`\nRemarques (${notes.length}) :`); notes.slice(0, 40).forEach(n => console.log(`  · ${n}`)); if (notes.length > 40) console.log(`  … et ${notes.length - 40} autres`) }
  // Choix validé le 11/11/2026 : les lignes de « Bilan foot "compta" » absentes du bilan principal restent dans l'Excel
  const comptaFoot = unmatched.filter(u => u.startsWith('Bilan foot'))
  const otherUnmatched = unmatched.filter(u => !u.startsWith('Bilan foot'))
  if (comptaFoot.length) console.log(`\n${comptaFoot.length} lignes de « Bilan foot "compta" » absentes du bilan principal : laissées dans l'Excel (choix validé), non importées.`)
  if (otherUnmatched.length) { console.log(`\nLignes Live sans correspondance dans Bilan Kelicful (${otherUnmatched.length}) — non importées :`); otherUnmatched.forEach(u => console.log(`  · ${u}`)) }
  if (problems.length) { console.log(`\nLignes refusées (${problems.length}) :`); problems.forEach(p => console.log(`  ✗ ${p}`)) }

  if (failed || problems.length) {
    console.log(`\n${failed} contrôle(s) en écart, ${problems.length} ligne(s) refusée(s) : rien n'est écrit. Corrigez l'Excel ou signalez l'écart.`)
    process.exit(2)
  }
  if (DRY) { console.log('\nTous les contrôles sont bons. Relancez sans --dry-run pour importer.'); return }

  // ── Import ──────────────────────────────────────────────────────
  const already = await api('bets?select=id&source=eq.import_excel&limit=1') as unknown[]
  const alreadyMoves = await api('money_moves?select=id&source=eq.import_excel&limit=1') as unknown[]
  const alreadyCompta = await api('compta_legacy?select=id&limit=1') as unknown[]
  if (already.length || alreadyMoves.length || alreadyCompta.length) { console.log('\nUn import Excel existe déjà dans la base : arrêt sans rien écrire.'); process.exit(3) }
  const tennisExisting = await api('tennis_elo?select=id&limit=1') as unknown[]

  const inserted: { table: string; ids: string[] }[] = []
  const insert = async (table: string, rows: Record<string, unknown>[]) => {
    for (let i = 0; i < rows.length; i += 500) {
      const out = await api(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(rows.slice(i, i + 500)) }) as { id: string }[]
      inserted.push({ table, ids: out.map(o => o.id) })
    }
    console.log(`  ${table} : ${rows.length} lignes`)
  }
  try {
    console.log('\nÉcriture…')
    await insert('bets', bets as unknown as Record<string, unknown>[])
    await insert('money_moves', moves)
    await insert('compta_legacy', compta)
    if (tennisExisting.length) console.log('  tennis_elo : déjà rempli, laissé tel quel (mise à jour par collage sur le site)')
    else await insert('tennis_elo', tennis)
    console.log('\nImport terminé. Le site affiche maintenant l\'historique.')
  } catch (e) {
    console.error(`\nÉchec : ${(e as Error).message}\nAnnulation de ce qui a été écrit pendant cette exécution…`)
    for (const { table, ids } of inserted.reverse()) {
      for (let i = 0; i < ids.length; i += 200) await api(`${table}?id=in.(${ids.slice(i, i + 200).join(',')})`, { method: 'DELETE' })
    }
    console.error('Annulation faite : la base est revenue à son état d\'avant l\'import.')
    process.exit(4)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
