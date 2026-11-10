// Graphiques SVG sobres (traits fins, segments droits, infobulle au survol et au toucher).
// Couleurs : tokens du thème ; un draft peut les surcharger avec ses variables --d-* :
// --d-ink, --d-muted, --d-grid, --d-win, --d-loss, --d-line-series, --d-surface, --d-font-num
// (facultatif : --d-bar-pos / --d-bar-neg pour colorer les barres autrement que le texte gain/perte)
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatEur, formatPct } from '@/lib/betStats'

const MONTH_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const eur0 = (n: number, signed = false) => formatEur(n, { signed, decimals: 0 })
const pct = (n: number, signed = false) => formatPct(n, { signed })

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1
  const step0 = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= count + 1) ?? mag * 10
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v))
  return ticks
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x + 12, 4), width - 164)
  return (
    <div
      className="pointer-events-none absolute z-10 w-[160px] px-2.5 py-2 text-xs leading-snug"
      style={{ left, top: Math.max(y - 10, 0), background: 'var(--d-tip-bg, var(--color-raised))', color: 'var(--d-tip-ink, var(--color-ink))', border: '1px solid var(--d-grid, var(--color-line))', borderRadius: 'var(--d-radius-sm, var(--radius-sm))', fontFamily: 'var(--d-font-num, var(--font-mono))' }}
    >
      {children}
    </div>
  )
}

type Pt = { date: string; value: number }

export function CumulativeChart({ points, height = 240, mode = 'continu', endLabel = true }: { points: Pt[]; height?: number; mode?: 'continu' | 'superpose'; endLabel?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number } | null>(null)
  const pad = { l: 52, r: 44, t: 12, b: 24 }
  const iw = Math.max(width - pad.l - pad.r, 10)
  const ih = height - pad.t - pad.b

  const t = (d: string) => new Date(d + 'T00:00:00').getTime()

  // Séries : une seule en continu, une par année en superposé (chaque saison repart de 0)
  const series = mode === 'continu'
    ? [{ key: 'all', pts: points.map(p => ({ ...p, x: t(p.date) })) }]
    : [...new Set(points.map(p => p.date.slice(0, 4)))].map(y => {
        const yearPts = points.filter(p => p.date.startsWith(y))
        const base = points[points.indexOf(yearPts[0]) - 1]?.value ?? 0
        return { key: y, pts: yearPts.map(p => ({ date: p.date, value: p.value - base, x: t('2000' + p.date.slice(4)) })) }
      })

  const all = series.flatMap(s => s.pts)
  if (!all.length) return <div ref={ref} />
  const xMin = Math.min(...all.map(p => p.x)), xMax = mode === 'continu' ? Math.max(...all.map(p => p.x)) : t('2000-12-31')
  const vMin = Math.min(0, ...all.map(p => p.value)), vMax = Math.max(0, ...all.map(p => p.value))
  const ticks = niceTicks(vMin, vMax)
  const yLo = Math.min(vMin, ticks[0]), yHi = Math.max(vMax, ticks[ticks.length - 1])
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * iw
  const sy = (v: number) => pad.t + ih - ((v - yLo) / (yHi - yLo || 1)) * ih
  const lastKey = series[series.length - 1].key

  const allYears = [...new Set(points.map(p => p.date.slice(0, 4)))]
  const years = mode === 'continu' ? allYears.slice(1).map(y => ({ y, x: sx(t(`${y}-01-01`)) })) : []

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const s = series.find(s => s.key === lastKey)!
    const candidates = mode === 'continu' ? s.pts : series.flatMap(s => s.pts.map(p => ({ ...p, key: s.key })))
    let best = candidates[0], bd = Infinity
    for (const p of candidates) { const d = Math.abs(sx(p.x) - mx); if (d < bd) { bd = d; best = p } }
    const d = best.date
    setHover({ x: sx(best.x), y: sy(best.value), label: `${d.slice(8, 10)} ${MONTH_FR[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`, value: best.value })
  }

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" style={{ fontFamily: 'var(--d-font-num, var(--font-mono))' }}>
          {ticks.map(v => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + iw} y1={sy(v)} y2={sy(v)} stroke="var(--d-grid, var(--color-line))" strokeWidth={1} strokeDasharray={v === 0 ? '4 3' : '2 4'} opacity={v === 0 ? 1 : 0.6} />
              <text x={pad.l - 8} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--d-muted, var(--color-muted))">{v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v / 1000).toLocaleString('fr-FR')}k`}</text>
            </g>
          ))}
          {mode === 'continu' && allYears.length > 0 && <text x={pad.l} y={height - 6} fontSize={11} fill="var(--d-muted, var(--color-muted))">{allYears[0]}</text>}
          {years.map(m => (
            <g key={m.y}>
              <line x1={m.x} x2={m.x} y1={pad.t} y2={pad.t + ih} stroke="var(--d-muted, var(--color-muted))" strokeWidth={1} opacity={0.5} />
              <text x={m.x + 4} y={height - 6} fontSize={11} fill="var(--d-muted, var(--color-muted))">{m.y}</text>
            </g>
          ))}
          {mode === 'superpose' && ['01', '04', '07', '10'].map(mm => (
            <text key={mm} x={sx(t(`2000-${mm}-01`))} y={height - 6} fontSize={11} fill="var(--d-muted, var(--color-muted))">{MONTH_FR[+mm - 1]}</text>
          ))}
          {series.map(s => {
            const isLast = s.key === lastKey
            const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.value).toFixed(1)}`).join('')
            const end = s.pts[s.pts.length - 1]
            return (
              <g key={s.key}>
                <path d={d} fill="none" stroke={isLast ? 'var(--d-line-series, var(--color-series, var(--color-ink)))' : 'var(--d-muted, var(--color-muted))'} strokeWidth={isLast ? 2 : 1.25} strokeLinejoin="round" opacity={isLast ? 1 : 0.7} />
                {mode === 'superpose' && (
                  <text x={sx(end.x) + 6} y={sy(end.value)} dy="0.32em" fontSize={11} fill={isLast ? 'var(--d-ink, var(--color-ink))' : 'var(--d-muted, var(--color-muted))'} fontWeight={isLast ? 700 : 400}>{s.key}</text>
                )}
              </g>
            )
          })}
          {mode === 'continu' && endLabel && (() => {
            const s = series[0].pts, end = s[s.length - 1]
            return <text x={sx(end.x) + 6} y={sy(end.value)} dy="0.32em" fontSize={12} fontWeight={700} fill="var(--d-ink, var(--color-ink))">{`${end.value >= 0 ? '+' : '−'}${Math.abs(Math.round(end.value / 100) / 10).toLocaleString('fr-FR')}k`}</text>
          })()}
          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={pad.t} y2={pad.t + ih} stroke="var(--d-ink, var(--color-ink))" strokeWidth={1} opacity={0.35} />
              <circle cx={hover.x} cy={hover.y} r={4.5} fill="var(--d-line-series, var(--color-series, var(--color-ink)))" stroke="var(--d-surface, var(--color-surface))" strokeWidth={2} />
            </g>
          )}
          <rect x={pad.l} y={0} width={iw} height={height} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }} />
        </svg>
      )}
      {hover && (
        <Tooltip x={hover.x} y={hover.y} width={width}>
          <div style={{ color: 'var(--d-tip-muted, var(--color-muted))' }}>{hover.label}</div>
          <div className="text-sm font-bold">{eur0(hover.value, true)}</div>
        </Tooltip>
      )}
    </div>
  )
}

type Month = { month: string; pl: number; staked: number; n: number; roi: number }

export function MonthlyBars({ months, height = 200 }: { months: Month[]; height?: number }) {
  // Valeurs affichées sur les barres seulement quand il y en a peu (une saison)
  const showValues = months.length <= 14
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 52, r: 8, t: showValues ? 22 : 10, b: showValues ? 46 : 22 }
  const iw = Math.max(width - pad.l - pad.r, 10)
  const ih = height - pad.t - pad.b
  const vMin = Math.min(0, ...months.map(m => m.pl)), vMax = Math.max(0, ...months.map(m => m.pl))
  const ticks = niceTicks(vMin, vMax, 3)
  const yLo = Math.min(vMin, ticks[0]), yHi = Math.max(vMax, ticks[ticks.length - 1])
  const sy = (v: number) => pad.t + ih - ((v - yLo) / (yHi - yLo || 1)) * ih
  const band = iw / months.length
  const bw = Math.max(band - 2, 1) // 2px d'espace entre barres
  const r = Math.min(4, bw / 2)
  const zero = sy(0)

  // Barre arrondie uniquement côté valeur, ancrée sur la ligne zéro
  const barPath = (x: number, v: number) => {
    const y = sy(v)
    if (v >= 0) return `M${x},${zero}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${zero}Z`
    return `M${x},${zero}V${y - r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y - r}V${zero}Z`
  }
  const h = hover != null ? months[hover] : null

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} className="block" style={{ fontFamily: 'var(--d-font-num, var(--font-mono))' }}>
          {ticks.map(v => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + iw} y1={sy(v)} y2={sy(v)} stroke="var(--d-grid, var(--color-line))" strokeDasharray={v === 0 ? undefined : '2 4'} strokeWidth={v === 0 ? 1.5 : 1} />
              <text x={pad.l - 8} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--d-muted, var(--color-muted))">{v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v / 1000).toLocaleString('fr-FR')}k`}</text>
            </g>
          ))}
          {months.map((m, i) => {
            const x = pad.l + i * band + 1
            const showLabel = showValues || m.month.endsWith('-01')
            const label = showValues ? MONTH_FR[+m.month.slice(5, 7) - 1] : m.month.slice(0, 4)
            return (
              <g key={m.month}>
                <path d={barPath(x, m.pl)} fill={m.pl >= 0 ? 'var(--d-bar-pos, var(--d-win, var(--color-win)))' : 'var(--d-bar-neg, var(--d-loss, var(--color-loss)))'} opacity={hover == null || hover === i ? 1 : 0.45} />
                {showValues && (
                  <text x={x + bw / 2} y={m.pl >= 0 ? sy(m.pl) - 5 : sy(m.pl) + 13} textAnchor="middle" fontSize={11} fill="var(--d-muted, var(--color-muted))">{eur0(m.pl, true)}</text>
                )}
                {showLabel && <text x={showValues ? x + bw / 2 : x} y={height - 6} textAnchor={showValues ? 'middle' : 'start'} fontSize={11} fill="var(--d-muted, var(--color-muted))">{label}</text>}
                <rect x={pad.l + i * band} y={0} width={band} height={height - pad.b} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
              </g>
            )
          })}
        </svg>
      )}
      {h && hover != null && (
        <Tooltip x={pad.l + hover * band + band / 2} y={Math.min(sy(h.pl), zero) - 4} width={width}>
          <div style={{ color: 'var(--d-tip-muted, var(--color-muted))' }}>{MONTH_FR[+h.month.slice(5, 7) - 1]} {h.month.slice(0, 4)}</div>
          <div className="text-sm font-bold">{eur0(h.pl, true)}</div>
          <div style={{ color: 'var(--d-tip-muted, var(--color-muted))' }}>{eur0(h.staked)} misés · {h.n} paris</div>
          <div>ROI {pct(h.roi, true)}</div>
        </Tooltip>
      )}
    </div>
  )
}
