// Réglages : chaque champ s'enregistre dès qu'on le quitte (ou Entrée), comme dans un tableur.
import { useState, type ReactNode } from 'react'
import type { AppSettings, Bet } from '@/types/betting'
import { useSettings, updateSettings, useUserPrefs } from '@/hooks/useBetting'
import { useSession } from '@/lib/session'
import { downloadFullBackup } from '@/lib/backup'
import { formatEur } from '@/lib/betStats'

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

/** Champ numérique enregistré à la sortie du champ, avec bornes. */
function NumField({ label, value, onSave, min, max, step = 'any', suffix, hint }: {
  label: string; value: number; onSave: (v: number) => void; min?: number; max?: number; step?: string; suffix?: string; hint?: ReactNode
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft == null) return
    const v = parseFloat(draft.replace(',', '.'))
    setDraft(null)
    if (Number.isNaN(v) || (min != null && v < min) || (max != null && v > max) || v === value) return
    onSave(v)
  }
  return (
    <label className="flex flex-wrap items-center gap-3">
      <span className="w-56 text-sm">{label}</span>
      <span className="flex items-center gap-1.5">
        <input inputMode="decimal" step={step} value={draft ?? String(value)} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="field w-28 px-2 py-1.5 font-mono text-sm" />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

function DateField({ label, value, onSave, hint }: { label: string; value: string | null; onSave: (v: string | null) => void; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-56 text-sm">{label}</span>
      <input type="date" value={value ?? ''} onChange={e => onSave(e.target.value || null)} className="field px-2 py-1.5 font-mono text-sm" />
      {value && <button onClick={() => onSave(null)} className="text-xs text-muted underline underline-offset-2 hover:text-ink">Retirer</button>}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
}

export function SettingsPage({ bets }: { bets: Bet[] }) {
  const { settings: s } = useSettings()
  const { userId } = useSession()
  const { prefs, save: savePrefs } = useUserPrefs(userId)
  const [newSport, setNewSport] = useState('')
  const [backup, setBackup] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' })
  const set = (patch: Partial<AppSettings>) => updateSettings(patch)

  const years = [...new Set(bets.map(b => +b.bet_date.slice(0, 4)))].sort()
  const hidden = new Set(prefs?.hidden_seasons ?? [])
  const used = new Map<string, number>()
  for (const b of bets) used.set(b.sport, (used.get(b.sport) ?? 0) + 1)

  const runBackup = async () => {
    setBackup({ busy: true, msg: 'Préparation…' })
    try {
      const counts = await downloadFullBackup(t => setBackup({ busy: true, msg: `Lecture : ${t}…` }))
      setBackup({ busy: false, msg: `Sauvegarde téléchargée (${counts.bets} paris, ${counts.matches} matchs, ${Object.keys(counts).length} tables).` })
    } catch (e) {
      setBackup({ busy: false, msg: `Échec : ${(e as Error).message}` })
    }
  }

  return (
    <main className="grid gap-4 px-4 py-4 md:px-6 xl:grid-cols-2">
      <Section title="Partage des bénéfices" sub="Portefeuille commun. Un pourcentage saisi sur un pari est prioritaire.">
        <NumField label="Part de Squawo" value={s.default_share_squawo} min={0} max={100} suffix="%" hint={`Kelicful : ${100 - s.default_share_squawo} %`} onSave={v => set({ default_share_squawo: v })} />
      </Section>

      <Section title="Mise selon la value" sub="Utilisé par le calculateur de mise.">
        <NumField label="Bankroll" value={s.bankroll} min={0} suffix="€" onSave={v => set({ bankroll: v })} />
        <NumField label="Exposant" value={s.stake_exponent} hint="facteur = 2 × cote^exposant" onSave={v => set({ stake_exponent: v })} />
      </Section>

      <Section title="Remise à zéro" sub="Les bilans démarrent à cette date. Rien n'est supprimé ; « Tout afficher » reste possible.">
        <DateField label="Portefeuille commun" value={s.reset_date_commun} onSave={v => set({ reset_date_commun: v })} />
        <DateField label="Portefeuille Kelicful" value={s.reset_date_kelicful} onSave={v => set({ reset_date_kelicful: v })} />
      </Section>

      <Section title="Saisons masquées" sub="Préférence personnelle : elles disparaissent de vos bilans et graphiques.">
        <div className="flex flex-wrap gap-1.5">
          {years.length ? years.map(y => (
            <button key={y} data-on={hidden.has(y)} onClick={() => savePrefs({ hidden_seasons: hidden.has(y) ? [...hidden].filter(x => x !== y) : [...hidden, y].sort() })} className="pill px-3 py-1.5 font-mono text-xs">
              {hidden.has(y) ? `${y} masquée` : y}
            </button>
          )) : <span className="text-sm text-muted">Aucune saison pour l'instant.</span>}
        </div>
      </Section>

      <Section title="Sports" sub="Liste proposée dans le formulaire de pari.">
        <div className="flex flex-wrap gap-1.5">
          {s.sports.map(sp => (
            <span key={sp} className="pill flex items-center gap-1.5 px-2.5 py-1 text-xs text-ink">
              {sp}{used.get(sp) ? <span className="font-mono text-faint">{used.get(sp)}</span> : null}
              <button onClick={() => set({ sports: s.sports.filter(x => x !== sp) })} disabled={!!used.get(sp)} title={used.get(sp) ? 'Utilisé par des paris' : 'Retirer'} className="text-faint hover:text-loss disabled:opacity-30">×</button>
            </span>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); const v = newSport.trim(); if (v && !s.sports.includes(v)) set({ sports: [...s.sports, v] }); setNewSport('') }} className="flex gap-2">
          <input value={newSport} onChange={e => setNewSport(e.target.value)} placeholder="Nouveau sport" className="field w-44 px-2 py-1.5 text-sm" />
          <button type="submit" className="btn-ghost px-3 py-1.5 text-sm">Ajouter</button>
        </form>
      </Section>

      <Section title="Modèles" sub="Paramètres des calculateurs.">
        <NumField label="Concentration s (BO3 / BO5)" value={s.series_concentration} min={0.1} onSave={v => set({ series_concentration: v })} />
        <NumField label="Elo tennis dur : part Elo général" value={s.tennis_w_dur} min={0} max={1} hint={`surface : ${Math.round((1 - s.tennis_w_dur) * 100)} %`} onSave={v => set({ tennis_w_dur: v })} />
        <NumField label="Elo tennis terre : part Elo général" value={s.tennis_w_terre} min={0} max={1} hint={`surface : ${Math.round((1 - s.tennis_w_terre) * 100)} %`} onSave={v => set({ tennis_w_terre: v })} />
        <NumField label="Elo tennis gazon : part Elo général" value={s.tennis_w_gazon} min={0} max={1} hint={`surface : ${Math.round((1 - s.tennis_w_gazon) * 100)} %`} onSave={v => set({ tennis_w_gazon: v })} />
      </Section>

      <Section title="Compta entre nous" sub="Solde de départ repris de l'onglet « Compta Kévin ».">
        <NumField label="Solde historique" value={s.compta_legacy_balance} suffix="€" hint="positif = Kelicful doit à Squawo" onSave={v => set({ compta_legacy_balance: v })} />
        <p className="text-xs text-muted">Actuellement : Kelicful doit {formatEur(s.compta_legacy_balance)} à Squawo avant les nouveaux paris. Chaque modification est gardée dans l'historique.</p>
      </Section>

      <Section title="Sauvegardes" sub="Une sauvegarde complète part chaque nuit sur le dépôt privé bpb-sauvegardes. Vous pouvez aussi en garder une copie sur cet appareil.">
        <button onClick={runBackup} disabled={backup.busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{backup.busy ? 'Sauvegarde…' : 'Télécharger une sauvegarde'}</button>
        {backup.msg && <p className="text-xs text-muted">{backup.msg}</p>}
      </Section>
    </main>
  )
}
