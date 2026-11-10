// Fiche de tokens d'un draft : rendue avec les variables CSS du draft lui-même
export interface Tokens {
  name: string
  intent: string
  colors: { name: string; value: string; role: string }[]
  fonts: { role: string; family: string; sample: string; cssVar: string }[]
  sizes: { name: string; px: number; use: string }[]
  spacing: number[]
  radii: { name: string; px: number }[]
  strokes: { name: string; px: number; use: string }[]
}

export function TokenSheet({ t }: { t: Tokens }) {
  const label = { color: 'var(--d-muted)', fontFamily: 'var(--d-font-body)' }
  const head = 'text-xs uppercase tracking-[0.12em] mb-3'
  return (
    <div className="space-y-10 p-6 md:p-10" style={{ color: 'var(--d-ink)', fontFamily: 'var(--d-font-body)' }}>
      <header>
        <div className={head} style={label}>Fiche de tokens</div>
        <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--d-font-display)', fontWeight: 'var(--d-display-weight)' as unknown as number }}>{t.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={label}>{t.intent}</p>
      </header>

      <section>
        <div className={head} style={label}>Couleurs et rôles</div>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--d-grid)', border: '1px solid var(--d-grid)' }}>
          {t.colors.map(c => (
            <div key={c.name} className="flex items-center gap-3 p-3" style={{ background: 'var(--d-surface)' }}>
              <div className="h-10 w-10 shrink-0" style={{ background: c.value, border: '1px solid var(--d-grid)', borderRadius: 'var(--d-radius-sm)' }} />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{c.name} <span className="font-normal" style={{ fontFamily: 'var(--d-font-num)', color: 'var(--d-muted)' }}>{c.value}</span></div>
                <div className="text-xs" style={label}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <div className={head} style={label}>Polices</div>
          <div className="space-y-4">
            {t.fonts.map(f => (
              <div key={f.role}>
                <div className="text-xs" style={label}>{f.role} — {f.family}</div>
                <div className="text-2xl [overflow-wrap:anywhere] md:text-3xl" style={{ fontFamily: `var(${f.cssVar})` }}>{f.sample}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 overflow-hidden">
          <div className={head} style={label}>Échelle de tailles</div>
          <div className="space-y-1.5">
            {t.sizes.map(s => (
              <div key={s.name} className="flex items-baseline gap-4">
                <span className="w-14 shrink-0 text-xs" style={{ ...label, fontFamily: 'var(--d-font-num)' }}>{s.px}px</span>
                <span style={{ fontSize: s.px, lineHeight: 1.15 }}>{s.name}</span>
                <span className="ml-auto text-xs" style={label}>{s.use}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-3">
        <div>
          <div className={head} style={label}>Espacements</div>
          <div className="space-y-1.5">
            {t.spacing.map(s => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-10 text-xs" style={{ ...label, fontFamily: 'var(--d-font-num)' }}>{s}</span>
                <span style={{ width: s * 2, height: 10, background: 'var(--d-accent)' }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className={head} style={label}>Rayons</div>
          <div className="flex flex-wrap gap-3">
            {t.radii.map(r => (
              <div key={r.name} className="text-center text-xs" style={label}>
                <div className="mb-1 h-14 w-14" style={{ border: '1.5px solid var(--d-ink)', borderRadius: r.px }} />
                {r.name} · {r.px}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className={head} style={label}>Traits</div>
          <div className="space-y-3">
            {t.strokes.map(s => (
              <div key={s.name}>
                <div style={{ height: s.px, background: 'var(--d-ink)' }} />
                <div className="mt-1 text-xs" style={label}>{s.name} · {s.px}px — {s.use}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
