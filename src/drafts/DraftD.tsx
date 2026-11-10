// Draft D — « Artifact » : l'esprit des artifacts Claude. Document calme, ivoire et blanc, filets fins,
// indicateurs en serif, tableaux denses, pastilles douces ; série en bleu, terracotta pour l'action.
import { useState, type ReactNode } from 'react'
import { CumulativeChart, MonthlyBars } from './charts'
import { SportIcon, PlusIcon } from './icons'
import { TokenSheet } from './TokenSheet'
import { TOKENS_D } from './tokens'
import {
  SEASON, SEASON_BETS, BY_SPORT, MONTHS_SEASON, CUMULATIVE_SEASON, RANKING, CALC, OPEN, BETS,
  eur, eur0, pct, odd, profit, type FakeBet,
} from './fakeData'
import type { Screen } from './DraftsPage'

const muted = { color: 'var(--d-muted)' }

function Signed({ v, cents = false }: { v: number; cents?: boolean }) {
  return <span style={{ color: v > 0 ? 'var(--d-win)' : v < 0 ? 'var(--d-loss)' : 'var(--d-ink)' }}>{cents ? eur(v, true) : eur0(v, true)}</span>
}

function Badge({ b }: { b: FakeBet }) {
  const won = b.result === 'Gagnant' || b.result === '1/2 Gagnant', lost = b.result === 'Perdant' || b.result === '1/2 Perdant'
  return <span className={`d-badge ${won ? 'd-badge-win' : lost ? 'd-badge-loss' : 'd-badge-neutral'}`}>{b.result}</span>
}

function Section({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-[15px] font-semibold">{title}</h2>{sub && <p className="mt-0.5 text-xs" style={muted}>{sub}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

function Shell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="draft-root draft-d pb-24 md:pb-12">
      <header className="sticky top-0 z-20" style={{ background: 'rgb(247 246 242 / 0.94)', borderBottom: '1px solid var(--d-grid)' }}>
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3 md:px-8">
          <span className="d-serif text-[19px]">BPB</span>
          <nav className="hidden gap-1 text-sm md:flex">
            {['Paris', 'Modèles', 'Kelicful', 'Réglages'].map(t => (
              <span key={t} className="rounded-md px-3 py-1.5" style={t === active ? { background: 'var(--d-surface-2)', color: 'var(--d-ink)', fontWeight: 500 } : muted}>{t}</span>
            ))}
          </nav>
          <button className="ml-auto flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium" style={{ background: 'var(--d-accent)', color: 'var(--d-accent-ink)' }}><PlusIcon size={15} /> Pari</button>
        </div>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 text-xs md:hidden" style={{ background: 'var(--d-surface)', borderTop: '1px solid var(--d-grid)' }}>
        {['Paris', 'Modèles', 'Kelicful', 'Réglages'].map(t => <span key={t} className="py-3.5 text-center" style={t === active ? { color: 'var(--d-ink)', fontWeight: 600 } : muted}>{t}</span>)}
      </nav>
    </div>
  )
}

function Bilan() {
  const [sport, setSport] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const rows = [...SEASON_BETS].reverse().filter(b => (!sport || b.sport === sport) && (!q || (b.game + b.selection).toLowerCase().includes(q.toLowerCase()))).slice(0, 12)
  return (
    <Shell active="Paris">
      <main className="mx-auto max-w-[1200px] space-y-9 px-4 py-7 md:px-8">
        <div>
          <p className="text-xs" style={muted}>Mis à jour il y a 4 h · portefeuille commun</p>
          <h1 className="d-serif mt-1 text-[30px] leading-tight">Bilan 2026</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed" style={muted}>
            Depuis le 1er janvier, <span style={{ color: 'var(--d-ink)' }}>{SEASON.n} paris</span> ont rapporté <Signed v={SEASON.pl} /> pour {eur0(SEASON.staked)} misés, soit un ROI de <span style={{ color: 'var(--d-ink)' }}>{pct(SEASON.roi, true)}</span>.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {['Toutes', '2024', '2025', '2026'].map(y => <span key={y} data-on={y === '2026'} className="d-pill px-3 py-1">{y}</span>)}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Bénéfice', <Signed v={SEASON.pl} />, 'Tous sports, 2026'],
            ['ROI', <span>{pct(SEASON.roi, true)}</span>, `Sur ${eur0(SEASON.staked)} misés`],
            ['Taux de réussite', <span>{pct(SEASON.hit, false)}</span>, `${SEASON.wins} gagnants sur ${SEASON.n} réglés`],
            ['CLV moyen', <span style={{ color: SEASON.clv >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{pct(SEASON.clv, true)}</span>, `${pct(SEASON.clvPos, false, 0)} des paris au-dessus de la clôture`],
          ].map(([l, v, s]) => (
            <div key={l as string} className="d-card px-4 py-3.5">
              <div className="text-xs" style={muted}>{l}</div>
              <div className="d-serif mt-1 text-[24px] leading-tight md:text-[28px]">{v}</div>
              <div className="mt-1 text-[11px]" style={muted}>{s}</div>
            </div>
          ))}
        </section>

        <Section title="Par sport" sub="Cliquez une ligne pour afficher ce sport.">
          <div className="d-card overflow-x-auto">
            <table className="d-table w-full min-w-[620px] text-[13px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead><tr><th className="px-4 py-2">Sport</th><th className="text-right">Paris</th><th className="text-right">Misé</th><th className="text-right">Réussite</th><th className="text-right">Bénéfice</th><th className="text-right">ROI</th><th className="px-4 text-right">CLV moy.</th></tr></thead>
              <tbody>
                {BY_SPORT.map(r => (
                  <tr key={r.sport} onClick={() => setSport(sport === r.sport ? null : r.sport)} className="cursor-pointer" style={sport === r.sport ? { boxShadow: 'inset 3px 0 0 var(--d-ink)' } : undefined}>
                    <td className="px-4 py-2"><span className="inline-flex items-center gap-2"><span style={muted}><SportIcon sport={r.sport} size={15} /></span>{r.sport}</span></td>
                    <td className="text-right">{r.n}</td><td className="text-right">{eur0(r.staked)}</td><td className="text-right">{pct(r.hit, false)}</td>
                    <td className="text-right"><Signed v={r.pl} /></td><td className="text-right"><span style={{ color: r.roi >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{pct(r.roi, true)}</span></td>
                    <td className="px-4 text-right">{pct(r.clv, true)}</td>
                  </tr>
                ))}
                <tr className="font-semibold"><td className="px-4 py-2">Tous sports</td><td className="text-right">{SEASON.n}</td><td className="text-right">{eur0(SEASON.staked)}</td><td className="text-right">{pct(SEASON.hit, false)}</td><td className="text-right"><Signed v={SEASON.pl} /></td><td className="text-right">{pct(SEASON.roi, true)}</td><td className="px-4 text-right">{pct(SEASON.clv, true)}</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Évolution du bénéfice cumulé" sub="Le bénéfice cumulé de tous les paris communs depuis le 1er janvier.">
          <div className="d-card px-3 py-4"><CumulativeChart points={CUMULATIVE_SEASON} height={240} /></div>
        </Section>

        <Section title="Bénéfice par mois">
          <div className="d-card px-3 py-4"><MonthlyBars months={MONTHS_SEASON} height={230} /></div>
        </Section>

        <Section title="Historique des paris" right={<span className="text-xs" style={muted}>Exporter CSV</span>}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} className="d-input w-full px-3 py-2 text-sm sm:w-64" placeholder="Joueur, équipe ou match…" />
            <span className="d-input px-3 py-2 text-sm" style={muted}>Tous les résultats ▾</span>
            <span className="text-xs" style={muted}>{SEASON_BETS.length} lignes</span>
          </div>
          <div className="d-card overflow-x-auto">
            <table className="d-table w-full min-w-[860px] text-[13px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead><tr><th className="px-4 py-2">Date</th><th>Sport</th><th>Pari</th><th>Match</th><th className="text-right">Mise</th><th className="text-right">Cote</th><th className="text-right">Clôture</th><th className="text-right">CLV</th><th className="pl-4">Résultat</th><th className="px-4 text-right">Bénéfice</th></tr></thead>
              <tbody>
                {rows.map(b => {
                  const clv = b.closing ? b.odds / b.closing - 1 : null
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-2" style={muted}>{b.date.split('-').reverse().join('/')}</td>
                      <td>{b.sport}</td><td className="font-medium">{b.selection}</td><td style={muted}>{b.game}</td>
                      <td className="text-right">{eur(b.stake)}</td><td className="text-right">{odd(b.odds)}</td>
                      <td className="text-right" style={muted}>{b.closing ? odd(b.closing) : '—'}</td>
                      <td className="text-right">{clv == null ? <span style={muted}>—</span> : <span style={{ color: clv > 0 ? 'var(--d-win)' : clv < 0 ? 'var(--d-loss)' : undefined }}>{pct(clv, true, 2)}</span>}</td>
                      <td className="pl-4"><Badge b={b} /></td>
                      <td className="px-4 text-right">{b.result === 'En cours' ? <span style={muted}>—</span> : <Signed v={profit(b)} cents />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </main>
    </Shell>
  )
}

function OddCell({ hdp, pr }: { hdp?: string; pr: number }) {
  const fav = pr >= 0.5
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ border: `1px solid ${fav ? 'var(--d-ink)' : 'var(--d-grid)'}`, background: 'var(--d-surface)' }}>
      <span className="text-xs" style={muted}>{hdp ?? 'Vainqueur'}</span>
      <span className="text-right"><span className="d-serif text-[18px]">{odd(1 / pr)}</span><span className="ml-2 text-[11px]" style={muted}>{pct(pr, false, 0)}</span></span>
    </div>
  )
}

function Modeles() {
  const { a, b, delta, p, sa, sb } = CALC
  const blocks: [string, [string | undefined, number, string | undefined, number][]][] = [
    ['BO3', [[undefined, sa.bo3Win, undefined, sb.bo3Win], ['−1.5', sa.bo3M15, '+1.5', sb.bo3P15], ['+1.5', sa.bo3P15, '−1.5', sb.bo3M15]]],
    ['BO5', [[undefined, sa.bo5Win, undefined, sb.bo5Win], ['−1.5', sa.bo5M15, '+1.5', sb.bo5P15], ['+1.5', sa.bo5P15, '−1.5', sb.bo5M15], ['−2.5', sa.bo5M25, '+2.5', sb.bo5P25], ['+2.5', sa.bo5P25, '−2.5', sb.bo5M25]]],
  ]
  return (
    <Shell active="Modèles">
      <main className="mx-auto max-w-[1200px] space-y-8 px-4 py-7 md:px-8">
        <div>
          <p className="text-xs" style={muted}>Modèles · Elo GDM depuis le 29/07</p>
          <h1 className="d-serif mt-1 text-[30px] leading-tight">LEC SU26</h1>
          <div className="mt-3 flex gap-1.5 overflow-x-auto text-xs">
            {['LEC SU26', 'LCK SU26', 'LPL SU26', 'EMEA SU26', 'Worlds 2026'].map((l, i) => <span key={l} data-on={i === 0} className="d-pill shrink-0 px-3 py-1">{l}</span>)}
          </div>
          <div className="mt-3 flex gap-5 text-sm" style={{ borderBottom: '1px solid var(--d-grid)' }}>
            {['Classement', 'GDM', 'Matchs', 'Équipes', 'Calculateurs'].map((t, i) => <span key={t} className="pb-2" style={i === 1 ? { borderBottom: '2px solid var(--d-ink)', fontWeight: 500 } : muted}>{t}</span>)}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
          <Section title="Classement Elo GDM" sub="Entrée, écart de golds moyen, performance et Elo de sortie.">
            <div className="d-card overflow-x-auto">
              <table className="d-table w-full min-w-[600px] text-[13px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead><tr><th className="px-4 py-2">#</th><th>Équipe</th><th className="text-right">Entrée</th><th className="text-right">GDM</th><th className="text-right">Games</th><th className="text-right">Perf</th><th className="px-4 text-right">Sortie</th></tr></thead>
                <tbody>
                  {RANKING.map((r, i) => {
                    const d = r.output - r.input
                    return (
                      <tr key={r.name}>
                        <td className="px-4 py-2" style={muted}>{i + 1}</td>
                        <td><span className="inline-flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: 'var(--d-surface-2)' }}>{r.initials}</span>{r.name}</span></td>
                        <td className="text-right" style={muted}>{r.input}</td>
                        <td className="text-right" style={{ color: r.gdm >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{r.gdm > 0 ? '+' : r.gdm < 0 ? '−' : ''}{Math.abs(r.gdm)}</td>
                        <td className="text-right">{r.games}</td><td className="text-right">{r.perf}</td>
                        <td className="px-4 text-right"><span className="d-serif text-[15px]">{r.output}</span> <span className="text-[11px]" style={{ color: d >= 0 ? 'var(--d-win)' : 'var(--d-loss)' }}>{d >= 0 ? '+' : '−'}{Math.abs(d)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Calculateur de cotes" sub="Cotes justes, sans marge · s = 40">
            <div className="d-card p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[a, b].map(t => <div key={t.name} className="d-input flex justify-between px-3 py-2"><span>{t.name}</span><span style={muted}>{t.output}</span></div>)}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div><div className="d-serif text-[28px] leading-none">{pct(p, false)}</div><div className="mt-1 text-xs" style={muted}>BO1 · {odd(1 / p)}</div></div>
                <div className="text-center text-xs" style={muted}>écart<br /><span style={{ color: 'var(--d-ink)' }}>{delta > 0 ? '+' : ''}{delta}</span></div>
                <div className="text-right"><div className="d-serif text-[28px] leading-none">{pct(1 - p, false)}</div><div className="mt-1 text-xs" style={muted}>BO1 · {odd(1 / (1 - p))}</div></div>
              </div>
              {blocks.map(([t, rows]) => (
                <div key={t} className="mt-4">
                  <div className="mb-1.5 text-xs font-semibold" style={muted}>{t}</div>
                  <div className="space-y-1.5">{rows.map(([ha, pa, hb, pb], i) => <div key={i} className="grid grid-cols-2 gap-1.5"><OddCell hdp={ha} pr={pa} /><OddCell hdp={hb} pr={pb} /></div>)}</div>
                </div>
              ))}
              <button className="mt-4 w-full rounded-lg py-2 text-sm font-medium" style={{ border: '1px solid var(--d-grid)' }}>Prendre ce pari</button>
            </div>
          </Section>
        </div>
      </main>
    </Shell>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="text-xs font-medium" style={muted}>{label}</span><div className="mt-1">{children}</div></label>
}

function Segmented({ options, value }: { options: string[]; value: string }) {
  return (
    <div className="grid rounded-lg p-0.5 text-sm" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)`, background: 'var(--d-surface-2)' }}>
      {options.map(o => <span key={o} className="rounded-md py-1.5 text-center" style={o === value ? { background: 'var(--d-surface)', boxShadow: '0 0 0 1px var(--d-grid)', fontWeight: 500 } : muted}>{o}</span>)}
    </div>
  )
}

function Pari() {
  const [res, setRes] = useState<Record<number, string>>({})
  const [stake, setStake] = useState('200')
  const [o, setO] = useState('1.85')
  const gain = (parseFloat(stake) || 0) * ((parseFloat(o) || 0) - 1)
  const open = [...OPEN, { ...BETS[BETS.length - 6], id: 9201, result: 'En cours' as const }]
  return (
    <Shell active="Paris">
      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 py-7 md:px-8 lg:grid-cols-[420px_1fr]">
        <Section title="Nouveau pari" sub="Mardi 10 novembre 2026">
          <div className="d-card space-y-4 p-4">
            <Field label="Match"><input className="d-input w-full px-3 py-2.5 text-[15px]" defaultValue="Nordlys vs Halcyon" /></Field>
            <Field label="Position"><input className="d-input w-full px-3 py-2.5 text-[15px]" defaultValue="Nordlys -1.5" /></Field>
            <div className="flex flex-wrap items-center gap-2 text-xs" style={muted}>
              <span className="d-pill inline-flex items-center gap-1.5 px-2.5 py-1" data-on="true"><SportIcon sport="E-sport" size={13} /> E-sport</span>
              <span className="d-pill px-2.5 py-1">Handicap</span>
              <span>détectés automatiquement</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mise (€)"><input className="d-input d-serif w-full px-3 py-2 text-[22px]" value={stake} onChange={e => setStake(e.target.value)} inputMode="decimal" /></Field>
              <Field label="Cote"><input className="d-input d-serif w-full px-3 py-2 text-[22px]" value={o} onChange={e => setO(e.target.value)} inputMode="decimal" /></Field>
            </div>
            <Field label="Portefeuille"><Segmented options={['Commun', 'Kelicful']} value="Commun" /></Field>
            <Field label="Statut"><Segmented options={['Pris', 'Vu pas pris']} value="Pris" /></Field>
            <div className="flex items-baseline justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--d-surface-2)' }}>
              <span className="text-sm" style={muted}>Gain si gagnant</span><span className="d-serif text-[20px]" style={{ color: 'var(--d-win)' }}>{eur(gain, true)}</span>
            </div>
            <div className="text-xs" style={muted}>Plus d'options : cote de clôture, ligue, placé par, part Squawo, note</div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg py-2.5 text-sm font-medium" style={{ background: 'var(--d-accent)', color: 'var(--d-accent-ink)' }}>Enregistrer</button>
              <button className="rounded-lg px-3 py-2.5 text-sm" style={{ border: '1px solid var(--d-grid)', background: 'var(--d-surface)' }}>Dupliquer</button>
            </div>
          </div>
        </Section>
        <Section title="En cours" sub={`${open.length} paris · ${eur0(open.reduce((s, b) => s + b.stake, 0))} engagés`}>
          <div className="d-card divide-y" style={{ borderColor: 'var(--d-grid)' }}>
            {open.map(b => (
              <div key={b.id} className="p-4" style={{ borderColor: 'var(--d-grid)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="font-medium">{b.selection}</div><div className="truncate text-xs" style={muted}>{b.game} · {b.placedBy}</div></div>
                  <div className="shrink-0 text-right"><div className="d-serif text-[18px]">{odd(b.odds)}</div><div className="text-xs" style={muted}>{eur0(b.stake)}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['Gagnant', 'Perdant', '1/2 G', '1/2 P', 'Remboursé'].map(x => {
                    const on = res[b.id] === x
                    const cls = x.includes('G') || x === 'Gagnant' ? 'd-badge-win' : x.includes('P') || x === 'Perdant' ? 'd-badge-loss' : 'd-badge-neutral'
                    return <button key={x} onClick={() => setRes(r => ({ ...r, [b.id]: x }))} className={`d-badge ${on ? cls : 'd-badge-neutral'} px-3 py-1.5 text-xs`} style={{ fontSize: 12 }}>{on ? '✓ ' : ''}{x}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </Shell>
  )
}

export function DraftD({ screen }: { screen: Screen }) {
  if (screen === 'tokens') return <div className="draft-root draft-d"><TokenSheet t={TOKENS_D} /></div>
  return screen === 'bilan' ? <Bilan /> : screen === 'modeles' ? <Modeles /> : <Pari />
}
