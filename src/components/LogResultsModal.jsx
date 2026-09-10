import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

export default function LogResultsModal({
  lobby,
  existingMatch = null,
  existingMatchMaps = [],
  isOpen,
  onClose,
  onSuccess
}) {
  const { session } = useAuth()
  const [mapWinners, setMapWinners] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sortedMaps = [...(lobby?.lobby_maps || [])].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  )

  useEffect(() => {
    if (existingMatchMaps && existingMatchMaps.length > 0) {
      const initialWinners = {}
      existingMatchMaps.forEach((mm) => {
        const mapKey = mm.lobby_map_id || `idx_${mm.order_index}`
        initialWinners[mapKey] = mm.winner_label || ''
      })
      setMapWinners(initialWinners)
    } else {
      setMapWinners({})
    }
    setError(null)
  }, [existingMatchMaps, isOpen])

  if (!isOpen || !lobby) return null

  const handleWinnerChange = (mapKey, value) => {
    setMapWinners((prev) => ({
      ...prev,
      [mapKey]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) {
      setError('You must be logged in to log results.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let matchId = existingMatch?.id

      if (!matchId) {
        const { data: newMatch, error: matchError } = await supabase
          .from('matches')
          .insert([
            {
              lobby_id: lobby.id,
              logged_by: session.user.id
            }
          ])
          .select()
          .single()

        if (matchError) throw matchError
        matchId = newMatch.id
      }

      for (let i = 0; i < sortedMaps.length; i++) {
        const mapItem = sortedMaps[i]
        const mapKey = mapItem.id || `idx_${i}`
        const winnerLabel = mapWinners[mapKey]?.trim() || 'Unspecified'

        const existingMM = existingMatchMaps.find(
          (mm) => mm.lobby_map_id === mapItem.id || mm.order_index === (mapItem.order_index ?? i)
        )

        if (existingMM) {
          const { error: mmUpdateError } = await supabase
            .from('match_maps')
            .update({ winner_label: winnerLabel })
            .eq('id', existingMM.id)

          if (mmUpdateError) throw mmUpdateError
        } else {
          const { error: mmInsertError } = await supabase.from('match_maps').insert([
            {
              match_id: matchId,
              lobby_map_id: mapItem.id || null,
              order_index: mapItem.order_index ?? i,
              winner_label: winnerLabel
            }
          ])

          if (mmInsertError) throw mmInsertError
        }
      }

      await supabase
        .from('lobbies')
        .update({ status: 'completed' })
        .eq('id', lobby.id)

      if (onSuccess) {
        onSuccess(matchId)
      }
    } catch (err) {
      console.error('Error logging match results:', err)
      setError(err.message || 'Failed to record match results.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative bg-white border-4 border-ink-black shadow-hard w-full max-w-xl p-6 md:p-8 transform rotate-1 my-8"
        style={{
          clipPath:
            'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
        }}
      >
        {/* Scrim Tape Header */}
        <div className="absolute -top-4 -left-3 bg-scream-yellow border-2 border-ink-black px-4 py-1 -rotate-3 shadow-tape flex items-center gap-2">
          <span className="text-battle-red font-bold">⚡</span>
          <span className="font-headline-sm text-sm uppercase text-ink-black">
            {existingMatch ? 'EDIT RESULTS' : 'LOG MATCH RESULTS'}
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-xl font-headline-sm text-ink-black hover:text-battle-red p-1 cursor-pointer"
        >
          ✕
        </button>

        <div className="mt-4 mb-6">
          <h2 className="font-headline-lg text-3xl uppercase text-ink-black leading-none font-bold">
            RECORD MAP WINNERS
          </h2>
          <p className="font-body-md text-xs text-on-surface-variant font-bold mt-2">
            Enter the winner (e.g. Team Red, Nova, Player name) for each map played in this set.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FFE5E7] text-battle-red font-label-bold text-xs uppercase border border-ink-black">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
            {sortedMaps.length === 0 ? (
              <div className="p-4 bg-paper-cream border-2 border-dashed border-ink-black text-center font-label-bold uppercase text-xs text-ink-black">
                No maps found for this lobby.
              </div>
            ) : (
              sortedMaps.map((mapItem, idx) => {
                const mapKey = mapItem.id || `idx_${idx}`
                const mapValue = mapWinners[mapKey] || ''

                return (
                  <div
                    key={mapKey}
                    className="p-3 bg-paper-cream border-2 border-ink-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-tape"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-scream-yellow text-ink-black font-headline-sm text-xs px-2 py-0.5 border border-ink-black">
                        MAP {idx + 1}
                      </span>
                      <span className="font-headline-sm text-sm uppercase truncate max-w-[180px] text-ink-black font-bold">
                        {mapItem.map_name || 'Brawl Stars'}
                      </span>
                    </div>

                    <div className="w-full sm:w-56">
                      <input
                        type="text"
                        placeholder="Who won this map?"
                        value={mapValue}
                        onChange={(e) => handleWinnerChange(mapKey, e.target.value)}
                        className="w-full bg-white border-2 border-ink-black px-3 py-1.5 text-xs font-body-md text-ink-black focus:bg-scream-yellow/20 focus:outline-none font-bold"
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t-2 border-dashed border-ink-black/30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-paper-cream text-ink-black font-headline-sm text-xs uppercase border-2 border-ink-black shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-battle-red text-white font-headline-sm text-xs uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE & VIEW MATCH →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
