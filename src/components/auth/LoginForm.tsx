import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(222 47% 11%)' }}>
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(216 34% 22%)' }}>
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">⚔️</div>
          <h1 className="text-xl font-bold text-white">LoL Stats</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 65%)' }}>Connexion requise</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
              style={{
                background: 'hsl(216 34% 18%)',
                border: '1px solid hsl(216 34% 22%)',
                '--tw-ring-color': 'hsl(217 91% 60%)',
              } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'hsl(215 20% 65%)' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2"
              style={{
                background: 'hsl(216 34% 18%)',
                border: '1px solid hsl(216 34% 22%)',
                '--tw-ring-color': 'hsl(217 91% 60%)',
              } as React.CSSProperties}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'hsl(217 91% 60%)', color: 'hsl(222 47% 11%)' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
