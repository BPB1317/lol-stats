// Route #/drafts?d=a|b|c|d&s=bilan|modeles|pari|tokens — données fictives uniquement.
// &clean=1 masque le sélecteur (pour les captures Playwright).
import { useEffect, useState } from 'react'
import './fonts'
import './drafts.css'
import { DraftA } from './DraftA'
import { DraftB } from './DraftB'
import { DraftC } from './DraftC'
import { DraftD } from './DraftD'

export type Screen = 'bilan' | 'modeles' | 'pari' | 'tokens'
type DraftId = 'a' | 'b' | 'c' | 'd'

function readHash() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const d = (q.get('d') ?? 'a') as DraftId
  const s = (q.get('s') ?? 'bilan') as Screen
  return { d: ['a', 'b', 'c', 'd'].includes(d) ? d : 'a', s: ['bilan', 'modeles', 'pari', 'tokens'].includes(s) ? s : 'bilan', clean: q.get('clean') === '1' }
}

export default function DraftsPage() {
  const [state, setState] = useState(readHash)
  useEffect(() => {
    const on = () => setState(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const href = (d: DraftId, s: Screen) => `#/drafts?d=${d}&s=${s}`
  const { d, s, clean } = state

  return (
    <>
      {d === 'a' ? <DraftA screen={s} /> : d === 'b' ? <DraftB screen={s} /> : d === 'c' ? <DraftC screen={s} /> : <DraftD screen={s} />}
      {!clean && (
        // Sélecteur neutre, hors DA, pour comparer les drafts
        <div className="fixed left-1/2 top-2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full p-1 text-xs shadow-lg"
          style={{ background: '#fff', color: '#111', border: '1px solid #ccc', fontFamily: 'system-ui, sans-serif' }}>
          {(['a', 'b', 'c', 'd'] as const).map(x => (
            <a key={x} href={href(x, s)} className="rounded-full px-2.5 py-1 font-bold uppercase" style={d === x ? { background: '#111', color: '#fff' } : {}}>{x}</a>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: '#ccc' }} />
          {(['bilan', 'modeles', 'pari', 'tokens'] as const).map(x => (
            <a key={x} href={href(d, x)} className="rounded-full px-2.5 py-1" style={s === x ? { background: '#eee', fontWeight: 700 } : {}}>{x}</a>
          ))}
        </div>
      )}
    </>
  )
}
