// Icônes de sport en trait simple, dessinées à la main (grille 24, trait currentColor)
import type { Sport } from './fakeData'

const P = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function SportIcon({ sport, size = 18, stroke = 1.6 }: { sport: Sport | 'Tous'; size?: number; stroke?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }
  switch (sport) {
    case 'E-sport':
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <path d="M7 8h10a4 4 0 0 1 4 4.4l-.5 4a2.4 2.4 0 0 1-4.3 1.2L14.5 15h-5l-1.7 2.6a2.4 2.4 0 0 1-4.3-1.2l-.5-4A4 4 0 0 1 7 8Z" />
          <path d="M8 10.5v3M6.5 12h3" /><path d="M15.5 11.5h.01M17.5 13h.01" strokeWidth={stroke + 0.8} />
        </g></svg>
      )
    case 'Tennis':
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M5.2 6.8c3 2.4 3 8 0 10.4M18.8 6.8c-3 2.4-3 8 0 10.4" />
        </g></svg>
      )
    case 'Football':
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m12 8 3.3 2.4-1.2 3.9H9.9l-1.2-3.9Z" />
          <path d="M12 8V3.6M15.3 10.4l4.1-1.4M14.1 14.3l2.6 3.5M9.9 14.3l-2.6 3.5M8.7 10.4 4.6 9" />
        </g></svg>
      )
    case 'Basket':
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5v17M6 6a9 9 0 0 1 0 12M18 6a9 9 0 0 0 0 12" />
        </g></svg>
      )
    case 'F1':
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <path d="M5 21V4" />
          <path d="M5 4h13l-2.5 4L18 12H5" />
          <path d="M9 4v8M13 4v8M5 8h11.5" strokeWidth={stroke * 0.8} />
        </g></svg>
      )
    case 'Cyclisme':
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <circle cx="6" cy="16" r="3.8" /><circle cx="18" cy="16" r="3.8" />
          <path d="M6 16 9.5 9h6L18 16M9.5 9 12 16h-6M14 6h2.5l-1 3" />
        </g></svg>
      )
    default:
      return (
        <svg {...common}><g {...P} strokeWidth={stroke}>
          <rect x="4" y="4" width="6.5" height="6.5" /><rect x="13.5" y="4" width="6.5" height="6.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" />
        </g></svg>
      )
  }
}

export function PlusIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>
}
