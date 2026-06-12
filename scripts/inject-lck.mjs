import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bvewyigxctxbtauqsaca.supabase.co'
const SUPABASE_ANON_KEY = process.argv[2] // passe la service_role key en argument

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// [team1_name, note1_or_null, team2_name, date]
const RAW = [
  ['Dplus KIA', 0.85, 'HANJIN BRION', '2026-06-06'],
  ['Dplus KIA', 0.85, 'HANJIN BRION', '2026-06-06'],
  ['Dplus KIA', 0.50, 'HANJIN BRION', '2026-06-06'],
  ['Nongshim RedForce', 0.20, 'Dplus KIA', '2026-05-31'],
  ['Nongshim RedForce', 0.20, 'Dplus KIA', '2026-05-31'],
  ['Hanwha Life Esports', null, 'HANJIN BRION', '2026-05-31'],
  ['Hanwha Life Esports', null, 'HANJIN BRION', '2026-05-31'],
  ['BNK FearX', null, 'T1', '2026-05-30'],
  ['BNK FearX', null, 'T1', '2026-05-30'],
  ['KT Rolster', 0.80, 'DN SOOPers', '2026-05-30'],
  ['KT Rolster', 0.75, 'DN SOOPers', '2026-05-30'],
  ['Gen.G', null, 'HANJIN BRION', '2026-05-29'],
  ['Gen.G', null, 'HANJIN BRION', '2026-05-29'],
  ['Dplus KIA', 0.80, 'Kiwoom DRX', '2026-05-29'],
  ['Dplus KIA', 0.20, 'Kiwoom DRX', '2026-05-29'],
  ['Dplus KIA', 0.80, 'Kiwoom DRX', '2026-05-29'],
  ['T1', 0.40, 'KT Rolster', '2026-05-28'],
  ['T1', 0.80, 'KT Rolster', '2026-05-28'],
  ['DN SOOPers', null, 'Nongshim RedForce', '2026-05-28'],
  ['DN SOOPers', null, 'Nongshim RedForce', '2026-05-28'],
  ['DN SOOPers', null, 'Nongshim RedForce', '2026-05-28'],
  ['Gen.G', 0.85, 'Hanwha Life Esports', '2026-05-27'],
  ['Gen.G', 0.65, 'Hanwha Life Esports', '2026-05-27'],
  ['Gen.G', 0.50, 'Hanwha Life Esports', '2026-05-27'],
  ['T1', 0.60, 'HANJIN BRION', '2026-05-24'],
  ['T1', 0.65, 'HANJIN BRION', '2026-05-24'],
  ['Gen.G', 0.85, 'DN SOOPers', '2026-05-24'],
  ['Gen.G', 0.85, 'DN SOOPers', '2026-05-24'],
  ['Hanwha Life Esports', 0.80, 'Nongshim RedForce', '2026-05-23'],
  ['Hanwha Life Esports', 0.80, 'Nongshim RedForce', '2026-05-23'],
  ['Hanwha Life Esports', 0.30, 'Nongshim RedForce', '2026-05-23'],
  ['Dplus KIA', 0.80, 'BNK FearX', '2026-05-23'],
  ['Dplus KIA', 0.25, 'BNK FearX', '2026-05-23'],
  ['Dplus KIA', 0.80, 'BNK FearX', '2026-05-23'],
  ['KT Rolster', 0.50, 'Gen.G', '2026-05-22'],
  ['KT Rolster', 0.15, 'Gen.G', '2026-05-22'],
  ['DN SOOPers', 0.15, 'Kiwoom DRX', '2026-05-22'],
  ['DN SOOPers', 0.20, 'Kiwoom DRX', '2026-05-22'],
  ['Dplus KIA', 0.80, 'HANJIN BRION', '2026-05-21'],
  ['Dplus KIA', 0.40, 'HANJIN BRION', '2026-05-21'],
  ['Dplus KIA', 0.60, 'HANJIN BRION', '2026-05-21'],
  ['BNK FearX', 0.15, 'Hanwha Life Esports', '2026-05-21'],
  ['BNK FearX', 0.35, 'Hanwha Life Esports', '2026-05-21'],
  ['Nongshim RedForce', 0.25, 'KT Rolster', '2026-05-20'],
  ['Nongshim RedForce', 0.35, 'KT Rolster', '2026-05-20'],
  ['Nongshim RedForce', 0.85, 'KT Rolster', '2026-05-20'],
  ['T1', 0.85, 'Kiwoom DRX', '2026-05-20'],
  ['T1', 0.30, 'Kiwoom DRX', '2026-05-20'],
  ['T1', 0.80, 'Kiwoom DRX', '2026-05-20'],
  ['HANJIN BRION', 0.30, 'Kiwoom DRX', '2026-05-17'],
  ['HANJIN BRION', 0.20, 'Kiwoom DRX', '2026-05-17'],
  ['HANJIN BRION', 0.50, 'Kiwoom DRX', '2026-05-17'],
  ['KT Rolster', 0.80, 'Hanwha Life Esports', '2026-05-17'],
  ['KT Rolster', 0.15, 'Hanwha Life Esports', '2026-05-17'],
  ['KT Rolster', 0.75, 'Hanwha Life Esports', '2026-05-17'],
  ['BNK FearX', 0.60, 'Nongshim RedForce', '2026-05-16'],
  ['BNK FearX', 0.75, 'Nongshim RedForce', '2026-05-16'],
  ['Gen.G', 0.20, 'T1', '2026-05-16'],
  ['Gen.G', 0.55, 'T1', '2026-05-16'],
  ['Gen.G', 0.85, 'T1', '2026-05-16'],
  ['HANJIN BRION', 0.85, 'DN SOOPers', '2026-05-15'],
  ['HANJIN BRION', 0.85, 'DN SOOPers', '2026-05-15'],
  ['Hanwha Life Esports', 0.75, 'Dplus KIA', '2026-05-15'],
  ['Hanwha Life Esports', 0.55, 'Dplus KIA', '2026-05-15'],
  ['Kiwoom DRX', 0.30, 'KT Rolster', '2026-05-14'],
  ['Kiwoom DRX', 0.70, 'KT Rolster', '2026-05-14'],
  ['Kiwoom DRX', 0.15, 'KT Rolster', '2026-05-14'],
  ['BNK FearX', 0.20, 'Gen.G', '2026-05-14'],
  ['BNK FearX', 0.20, 'Gen.G', '2026-05-14'],
  ['DN SOOPers', 0.15, 'Dplus KIA', '2026-05-13'],
  ['DN SOOPers', 0.15, 'Dplus KIA', '2026-05-13'],
  ['T1', 0.75, 'Nongshim RedForce', '2026-05-13'],
  ['T1', 0.85, 'Nongshim RedForce', '2026-05-13'],
  ['Kiwoom DRX', 0.30, 'Hanwha Life Esports', '2026-05-10'],
  ['Kiwoom DRX', 0.15, 'Hanwha Life Esports', '2026-05-10'],
  ['Kiwoom DRX', 0.75, 'Hanwha Life Esports', '2026-05-10'],
  ['T1', 0.70, 'Dplus KIA', '2026-05-10'],
  ['T1', 0.80, 'Dplus KIA', '2026-05-10'],
  ['HANJIN BRION', 0.65, 'Nongshim RedForce', '2026-05-09'],
  ['HANJIN BRION', 0.70, 'Nongshim RedForce', '2026-05-09'],
  ['KT Rolster', 0.15, 'BNK FearX', '2026-05-09'],
  ['KT Rolster', 0.20, 'BNK FearX', '2026-05-09'],
  ['Gen.G', 0.85, 'Kiwoom DRX', '2026-05-08'],
  ['Gen.G', 0.90, 'Kiwoom DRX', '2026-05-08'],
  ['T1', 0.90, 'DN SOOPers', '2026-05-08'],
  ['T1', 0.90, 'DN SOOPers', '2026-05-08'],
  ['BNK FearX', 0.40, 'HANJIN BRION', '2026-05-07'],
  ['BNK FearX', 0.20, 'HANJIN BRION', '2026-05-07'],
  ['KT Rolster', 0.50, 'Dplus KIA', '2026-05-07'],
  ['KT Rolster', 0.65, 'Dplus KIA', '2026-05-07'],
  ['DN SOOPers', 0.40, 'Hanwha Life Esports', '2026-05-06'],
  ['DN SOOPers', 0.15, 'Hanwha Life Esports', '2026-05-06'],
  ['Nongshim RedForce', 0.25, 'Gen.G', '2026-05-06'],
  ['Nongshim RedForce', 0.50, 'Gen.G', '2026-05-06'],
]

function getStage(date) {
  if (date >= '2026-06-03') return 'WEEK5'
  if (date >= '2026-05-27') return 'WEEK4'
  if (date >= '2026-05-20') return 'WEEK3'
  if (date >= '2026-05-13') return 'WEEK2'
  return 'WEEK1'
}

function normalize(name) {
  return name.toLowerCase().replace(/[\s.'\-]/g, '')
}

async function main() {
  if (!process.argv[2]) {
    console.error('Usage: node scripts/inject-lck.mjs SERVICE_ROLE_KEY')
    return
  }

  // Find LCK league
  const { data: leagues, error: leagueErr } = await supabase.from('leagues').select('*')
  if (leagueErr) { console.error('Error fetching leagues:', leagueErr); return }

  const lck = leagues.find(l =>
    l.short_name?.toUpperCase() === 'LCK' ||
    l.name?.toUpperCase().includes('LCK')
  )
  if (!lck) {
    console.error('LCK league not found. Available leagues:', leagues.map(l => `${l.name} (${l.short_name})`))
    return
  }
  console.log(`✓ League found: ${lck.name} (id: ${lck.id})`)

  // Get teams
  const { data: teams, error: teamsErr } = await supabase.from('teams').select('*').eq('league_id', lck.id)
  if (teamsErr) { console.error('Error fetching teams:', teamsErr); return }
  console.log(`✓ ${teams.length} teams found: ${teams.map(t => t.name).join(', ')}`)

  // Build name map (normalized)
  const nameMap = {}
  for (const t of teams) nameMap[normalize(t.name)] = t

  // Resolve all team names
  const unmatched = new Set()
  const resolved = RAW.map(([t1name, note1, t2name, date]) => {
    const t1 = nameMap[normalize(t1name)]
    const t2 = nameMap[normalize(t2name)]
    if (!t1) unmatched.add(t1name)
    if (!t2) unmatched.add(t2name)
    return { t1, t1name, note1, t2, t2name, date }
  })

  if (unmatched.size > 0) {
    console.error('\n✗ Unmatched team names:', [...unmatched])
    console.log('Available (normalized):', Object.keys(nameMap))
    return
  }
  console.log('✓ All team names resolved')

  // Query existing manual matches for this date range in LCK
  const { data: existing } = await supabase.from('matches')
    .select('id, team1_id, team2_id, match_date')
    .eq('league_id', lck.id)
    .eq('source', 'manual')
    .gte('match_date', '2026-05-06')
    .lte('match_date', '2026-06-06')

  // Count existing per key
  const existingCounts = {}
  for (const m of existing ?? []) {
    const key = `${m.team1_id}|${m.team2_id}|${m.match_date}`
    existingCounts[key] = (existingCounts[key] ?? 0) + 1
  }

  // Group rows by key (in order)
  const groups = {}
  for (const row of resolved) {
    const key = `${row.t1.id}|${row.t2.id}|${row.date}`
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
  }

  // Insert missing rows per group
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const [key, rows] of Object.entries(groups)) {
    const alreadyIn = existingCounts[key] ?? 0
    const toInsert = rows.slice(alreadyIn)
    if (toInsert.length === 0) { skipped += rows.length; continue }
    skipped += alreadyIn

    for (const row of toInsert) {
      const stage = getStage(row.date)
      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({
          league_id: lck.id,
          team1_id: row.t1.id,
          team2_id: row.t2.id,
          winner_id: null,
          score: null,
          stage,
          match_date: row.date,
          source: 'manual',
        })
        .select()
        .single()

      if (matchErr) {
        console.error(`✗ Match insert error (${row.t1name} vs ${row.t2name} ${row.date}):`, matchErr.message)
        errors++
        continue
      }

      if (row.note1 != null) {
        const { error: noteErr } = await supabase.from('match_notes').insert({
          match_id: match.id,
          note_date: row.date,
          note_team1: row.note1,
          team1_id: row.t1.id,
          team2_id: row.t2.id,
        })
        if (noteErr) {
          console.error(`✗ Note insert error (${row.t1name} vs ${row.t2name} ${row.date}):`, noteErr.message)
        }
      }

      inserted++
    }
  }

  console.log(`\n✓ Done: ${inserted} inserted, ${skipped} already existed, ${errors} errors`)
}

main().catch(console.error)
