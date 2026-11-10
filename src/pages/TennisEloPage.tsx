// Elo tennis ATP / WTA : tableau des joueurs, Elo combinés, calculateur de match, mise à jour par collage.
import { useMemo, useState } from 'react'
import type { TennisElo } from '@/types/betting'
import { useSettings, useTennisElo, replaceTennisElo } from '@/hooks/useBetting'
import { parseEloPaste, combinedElo, eloProb, SURFACES, type Surface } from '@/lib/tennis'
import { formatPct } from '@/lib/betStats'
import { notify } from '@/lib/toast'

const r1 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(1))
const odd = (p: number) => (p > 0 ? (1 / p).toFixed(2) : '—')

function PlayerInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0 flex-1"><span className="mb-1 block text-xs text-muted">{label}</span>
      <input list={id} value={value} onChange={e => onChange(e.target.value)} placeholder="Nom du joueur" className="field w-full px-3 py-2 text-sm" /></label>
  )
}

function Calculator({ players, wO, wS, tour }: { players: TennisElo[]; wO: number; wS: number; tour: string }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [surface, setSurface] = useState<Surface>('dur')
  const [manual, setManual] = useState('')
  const [bookA, setBookA] = useState('')
  const [bookB, setBookB] = useState('')
  const pa = players.find(p => p.player.toLowerCase() === a.trim().toLowerCase())
  const pb = players.find(p => p.player.toLowerCase() === b.trim().toLowerCase())
  const ea = pa ? combinedElo(pa, surface, wO, wS) : null
  const eb = pb ? combinedElo(pb, surface, wO, wS) : null
  const manualGap = parseFloat(manual.replace(',', '.'))
  const gap = !Number.isNaN(manualGap) ? manualGap : ea != null && eb != null ? ea - eb : null
  const p = gap == null ? null : eloProb(gap, 0)
  const value = (book: string, prob: number) => { const o = parseFloat(book.replace(',', '.')); return o > 1 ? o * prob - 1 : null }
  const listId = `players-${tour}`

  return (
    <section className="panel p-4">
      <h2 className="text-sm font-semibold">Calculateur de match</h2>
      <datalist id={listId}>{players.map(x => <option key={x.id} value={x.player} />)}</datalist>
      <div className="mt-3 flex flex-wrap gap-3">
        <PlayerInput id={listId} label="Joueur A" value={a} onChange={setA} />
        <PlayerInput id={listId} label="Joueur B" value={b} onChange={setB} />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div><span className="mb-1 block text-xs text-muted">Surface</span>
          <div className="flex gap-1">{SURFACES.map(s => <button key={s.key} data-on={surface === s.key} onClick={() => setSurface(s.key)} className="pill px-3 py-1.5 text-xs">{s.label}</button>)}</div></div>
        <label><span className="mb-1 block text-xs text-muted">Écart manuel (facultatif)</span>
          <input value={manual} onChange={e => setManual(e.target.value)} inputMode="decimal" placeholder={gap != null && Number.isNaN(manualGap) ? gap.toFixed(0) : 'ex. 134'} className="field w-32 px-2 py-1.5 font-mono text-sm" /></label>
      </div>

      {(pa || pb) && (
        <table className="mt-3 w-full font-mono text-[13px]">
          <thead><tr className="border-b border-line text-muted"><th className="py-1.5 text-left font-sans font-medium">Elo + surface</th>{SURFACES.map(s => <th key={s.key} className="text-right font-sans font-medium">{s.label}</th>)}</tr></thead>
          <tbody>
            {[pa, pb].map((x, i) => x && (
              <tr key={i} className="border-b border-line"><td className="py-1.5 font-sans">{x.player}</td>{SURFACES.map(s => <td key={s.key} className={`text-right ${s.key === surface ? 'font-semibold' : 'text-muted'}`}>{r1(combinedElo(x, s.key, wO, wS))}</td>)}</tr>
            ))}
            {pa && pb && (
              <tr><td className="py-1.5 font-sans text-muted">Écart A − B</td>{SURFACES.map(s => { const x = combinedElo(pa, s.key, wO, wS), y = combinedElo(pb, s.key, wO, wS); return <td key={s.key} className={`text-right ${s.key === surface ? 'font-semibold' : 'text-muted'}`}>{x != null && y != null ? `${x - y > 0 ? '+' : x - y < 0 ? '−' : ''}${Math.abs(x - y).toFixed(1)}` : '—'}</td> })}</tr>
            )}
          </tbody>
        </table>
      )}
      {(pa && ea == null) || (pb && eb == null) ? <p className="mt-2 text-xs text-warn">Elo {SURFACES.find(s => s.key === surface)!.label.toLowerCase()} manquant pour un joueur : saisissez un écart manuel.</p> : null}

      {p != null && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[{ name: pa?.player ?? 'Joueur A', prob: p, book: bookA, setBook: setBookA }, { name: pb?.player ?? 'Joueur B', prob: 1 - p, book: bookB, setBook: setBookB }].map(side => {
            const v = value(side.book, side.prob)
            return (
              <div key={side.name} className="rounded-md border border-line bg-stripe p-3">
                <div className="truncate text-sm font-medium">{side.name}</div>
                <div className="mt-1 flex items-end justify-between">
                  <div><div className="font-mono text-2xl font-semibold">{formatPct(side.prob)}</div><div className="text-xs text-muted">probabilité</div></div>
                  <div className="text-right"><div className="font-mono text-xl font-semibold">{odd(side.prob)}</div><div className="text-xs text-muted">cote juste</div></div>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">Cote du bookmaker
                  <input value={side.book} onChange={e => side.setBook(e.target.value)} inputMode="decimal" className="field w-20 px-2 py-1 font-mono text-sm" /></label>
                {v != null && <div className={`mt-1 font-mono text-sm ${v > 0 ? 'text-win' : 'text-loss'}`}>value {formatPct(v, { signed: true })}</div>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function PasteUpdate({ tour, count }: { tour: 'ATP' | 'WTA'; count: number }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const parsed = useMemo(() => (text.trim() ? parseEloPaste(text) : null), [text])
  const apply = async () => {
    if (!parsed?.rows.length) return
    setBusy(true)
    const err = await replaceTennisElo(tour, parsed.rows)
    setBusy(false)
    if (err) notify('error', `Mise à jour impossible : ${err.message}`)
    else { notify('ok', `${parsed.rows.length} joueurs ${tour} mis à jour`); setText(''); setOpen(false) }
  }
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Mettre à jour par collage</h2>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost px-3 py-1.5 text-xs">{open ? 'Fermer' : 'Coller un tableau'}</button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">Copiez le tableau de Tennis Abstract (en-têtes compris) ou un CSV « joueur ; Elo ; dur ; terre ; gazon », puis collez-le ici.</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6} className="field w-full px-3 py-2 font-mono text-xs" placeholder={'Player\tElo\thElo\tcElo\tgElo\nJannik Sinner\t2296.9\t2234.3\t2186.8\t2100.5'} />
          {parsed && (
            <div className="text-xs">
              <p className={parsed.rows.length ? 'text-muted' : 'text-loss'}>
                {parsed.rows.length} joueurs lus{parsed.headerFound ? ' (colonnes repérées par leur en-tête)' : ' (sans en-tête : ordre joueur, Elo, dur, terre, gazon)'}{parsed.skipped ? `, ${parsed.skipped} lignes ignorées` : ''}.
              </p>
              {parsed.rows.length > 0 && (
                <table className="mt-2 font-mono">
                  <tbody>{parsed.rows.slice(0, 5).map(r => <tr key={r.player}><td className="pr-4 font-sans">{r.player}</td><td className="pr-3">{r1(r.elo)}</td><td className="pr-3 text-muted">{r1(r.helo)}</td><td className="pr-3 text-muted">{r1(r.celo)}</td><td className="text-muted">{r1(r.gelo)}</td></tr>)}</tbody>
                </table>
              )}
              {parsed.rows.length > 0 && (
                <button onClick={apply} disabled={busy} className="btn-primary mt-3 px-3 py-2 text-sm disabled:opacity-50">
                  {busy ? 'Mise à jour…' : `Remplacer la liste ${tour} (${count} → ${parsed.rows.length} joueurs)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export function TennisEloPage({ tour }: { tour: 'ATP' | 'WTA' }) {
  const { players, loading } = useTennisElo(tour)
  const { settings } = useSettings()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'elo' | Surface>('elo')
  const wO = settings.tennis_elo_weight_overall, wS = settings.tennis_elo_weight_surface

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? players.filter(p => p.player.toLowerCase().includes(s)) : players
    const key = (p: TennisElo) => sort === 'elo' ? Number(p.elo ?? -1) : (combinedElo(p, sort, wO, wS) ?? -1)
    return [...list].sort((a, b) => key(b) - key(a))
  }, [players, q, sort, wO, wS])

  if (loading) return <div className="py-16 text-center text-muted">Chargement…</div>
  const updated = players.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), '')
  const link = tour === 'ATP' ? 'https://tennisabstract.com/reports/atp_elo_ratings.html' : 'https://tennisabstract.com/reports/wta_elo_ratings.html'

  return (
    <main className="space-y-4 px-4 py-4 md:px-6">
      <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
        <Calculator players={players} wO={wO} wS={wS} tour={tour} />
        <PasteUpdate tour={tour} count={players.length} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <span className="text-sm font-semibold">{players.length} joueurs</span>
          {updated && <span className="text-xs text-muted">mis à jour le {updated.slice(0, 10).split('-').reverse().join('/')}</span>}
          <span className="text-xs text-muted">· Elo + surface = {wO} × Elo + {wS} × Elo surface</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un joueur…" className="field ml-auto w-full px-3 py-1.5 text-xs sm:w-56" />
        </div>
        {players.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">Aucun joueur. Collez le tableau de Tennis Abstract ci-dessus (ou attendez l'import de l'Excel).</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[760px] font-mono text-[13px]">
              <thead className="sticky top-0 bg-surface"><tr className="border-b border-line text-muted">
                <th className="px-4 py-2 text-left font-sans font-medium">#</th><th className="text-left font-sans font-medium">Joueur</th>
                <th className="text-right font-sans font-medium"><button onClick={() => setSort('elo')} className="hover:text-ink">Elo{sort === 'elo' ? ' ↓' : ''}</button></th>
                <th className="text-right font-sans font-medium">Dur</th><th className="text-right font-sans font-medium">Terre</th><th className="text-right font-sans font-medium">Gazon</th>
                {SURFACES.map(s => <th key={s.key} className="text-right font-sans font-medium last:pr-4"><button onClick={() => setSort(s.key)} className="hover:text-ink">Elo + {s.label.toLowerCase()}{sort === s.key ? ' ↓' : ''}</button></th>)}
              </tr></thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="border-b border-line hover:bg-stripe">
                    <td className="px-4 py-1.5 text-faint">{i + 1}</td><td className="font-sans">{p.player}</td>
                    <td className="text-right font-semibold">{r1(p.elo)}</td><td className="text-right text-muted">{r1(p.helo)}</td><td className="text-right text-muted">{r1(p.celo)}</td><td className="text-right text-muted">{r1(p.gelo)}</td>
                    {SURFACES.map(s => <td key={s.key} className={`text-right last:pr-4 ${sort === s.key ? 'font-semibold' : ''}`}>{r1(combinedElo(p, s.key, wO, wS))}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted">Source : <a href={link} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">Tennis Abstract — Elo {tour}</a></p>
    </main>
  )
}
