import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function JoinByCode({ className = '', placeholder = 'ENTER CODE', compact = false }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    // Keep uppercase alphanumeric only, max 6 characters
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
    setCode(sanitized)
    if (error) setError(null)
  }

  const handleJoin = async (e) => {
    if (e) e.preventDefault()
    const cleanCode = code.trim().toUpperCase()

    if (!cleanCode) {
      setError('Enter a join code')
      return
    }

    if (cleanCode.length < 6) {
      setError('Code must be 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('lobbies')
        .select('id, join_code')
        .ilike('join_code', cleanCode)
        .maybeSingle()

      if (fetchErr || !data) {
        setError('Lobby not found — check the code')
        return
      }

      navigate(`/lobby/${data.id}`)
    } catch (err) {
      console.error('Error looking up lobby by code:', err)
      setError('Lobby not found — check the code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <form onSubmit={handleJoin} className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={handleInputChange}
          placeholder={placeholder}
          maxLength={6}
          disabled={loading}
          className={`bg-white border-2 border-ink-black font-headline-sm uppercase text-ink-black tracking-widest placeholder:text-neutral-400 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:bg-scream-yellow transition-colors ${
            compact ? 'px-3 py-2 text-sm w-full' : 'px-3.5 py-2.5 text-base w-36 sm:w-44'
          }`}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className={`bg-battle-red text-white border-2 border-ink-black font-headline-sm uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold flex-shrink-0 flex items-center justify-center gap-1 ${
            compact ? 'px-3.5 py-2 text-xs' : 'px-4 py-2.5 text-sm'
          }`}
        >
          {loading ? (
            <span className="inline-block animate-spin">⚡</span>
          ) : (
            <>
              <span>GO</span>
              <span>⚡</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="bg-battle-red text-white text-xs font-headline-sm uppercase px-2.5 py-1 border border-ink-black shadow-sm flex items-center gap-1">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
