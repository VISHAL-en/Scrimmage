import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import { getAllMaps } from '../lib/maps'
import { formatActionError } from '../lib/authErrors'
import dayjs from 'dayjs'

export default function CreateLobby() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1: Type & Slots, 2: Maps, 3: Details & Confirm

  // Form State
  const [matchType, setMatchType] = useState('friendly') // 'friendly' | 'power_league'
  const [slotCount, setSlotCount] = useState(6)
  const [scheduledDate, setScheduledDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [scheduledTime, setScheduledTime] = useState(dayjs().add(30, 'minute').format('HH:mm'))
  const [selectedMaps, setSelectedMaps] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [notes, setNotes] = useState('')

  // Data
  const [availableMaps, setAvailableMaps] = useState([])
  const [userTeams, setUserTeams] = useState([])
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch live map rotation
    setLoadingMaps(true)
    getAllMaps().then((maps) => {
      setAvailableMaps(maps || [])
      setLoadingMaps(false)
    })

    // Fetch teams where user is member/owner
    if (session?.user?.id) {
      supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams:team_id ( id, name, tag )
        `)
        .eq('profile_id', session.user.id)
        .in('role', ['member', 'owner'])
        .then(({ data }) => {
          const teamsList = (data || []).map((tm) => tm.teams).filter(Boolean)
          setUserTeams(teamsList)
        })
    }
  }, [session])

  const handleMapToggle = (mapItem) => {
    const exists = selectedMaps.some((m) => m.id === mapItem.id)
    if (exists) {
      setSelectedMaps(selectedMaps.filter((m) => m.id !== mapItem.id))
    } else {
      if (selectedMaps.length >= 7) {
        alert('Maximum 7 maps per set.')
        return
      }
      setSelectedMaps([...selectedMaps, mapItem])
    }
  }

  const handleCreateLobby = async (e) => {
    if (e) e.preventDefault()
    if (!session?.user?.id) {
      setError('You must be logged in to host a lobby.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`

      // 1. Insert into lobbies
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .insert([
          {
            host_id: session.user.id,
            type: matchType,
            scheduled_time: new Date(scheduledDateTime).toISOString(),
            slot_count: Number(slotCount),
            team_id: selectedTeamId || null,
            notes: notes.trim() || null,
            status: 'open'
          }
        ])
        .select()
        .single()

      if (lobbyError) throw lobbyError

      const newLobbyId = lobbyData.id

      // 2. Insert selected maps into lobby_maps
      if (selectedMaps.length > 0) {
        const mapsPayload = selectedMaps.map((m, idx) => ({
          lobby_id: newLobbyId,
          map_id: String(m.id),
          map_name: m.map_name || m.name,
          mode: m.mode || '3V3',
          order_index: idx
        }))

        const { error: mapsError } = await supabase.from('lobby_maps').insert(mapsPayload)
        if (mapsError) throw mapsError
      }

      // 3. Add host as participant automatically
      await supabase.from('lobby_participants').insert([
        {
          lobby_id: newLobbyId,
          profile_id: session.user.id
        }
      ])

      navigate(`/lobby/${newLobbyId}`)
    } catch (err) {
      console.error('Error creating lobby:', err)
      const exactMsg = formatActionError(err, 'Failed to create lobby.')
      setError(exactMsg)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        {/* Title */}
        <div className="mb-10 relative">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>HOST SCRIM SETUP</span>
          </div>

          <h1
            className="font-display-xl text-5xl sm:text-7xl uppercase tracking-tighter text-battle-red leading-none"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            CREATE <span className="text-scream-yellow">LOBBY.</span>
          </h1>
        </div>

        {/* Step Progress Tracker */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { num: 1, label: 'FORMAT & TIME' },
            { num: 2, label: 'MAP ROTATION' },
            { num: 3, label: 'REVIEW & HOST' }
          ].map((s) => {
            const isActive = step === s.num
            const isDone = step > s.num
            return (
              <div
                key={s.num}
                className={`px-4 py-2 border-2 border-ink-black font-headline-sm text-xs uppercase shadow-tape flex items-center gap-2 flex-shrink-0 font-bold ${
                  isActive
                    ? 'bg-scream-yellow text-ink-black -rotate-1'
                    : isDone
                    ? 'bg-acid-green text-ink-black'
                    : 'bg-white text-on-surface-variant'
                }`}
              >
                <span>{s.num}.</span>
                <span>{s.label}</span>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#FFE5E7] text-battle-red border-2 border-ink-black shadow-hard font-label-bold text-xs uppercase font-bold">
            ⚠ {error}
          </div>
        )}

        {/* STEP 1: Format, Slots, and Schedule */}
        {step === 1 && (
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform rotate-1 flex flex-col gap-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            {/* Match Type */}
            <div className="flex flex-col gap-2">
              <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">1. MATCH TYPE</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMatchType('friendly')}
                  className={`p-4 border-2 border-ink-black font-headline-sm text-sm uppercase text-left transition-all cursor-pointer shadow-tape ${
                    matchType === 'friendly' ? 'bg-scream-yellow text-ink-black -rotate-1 font-bold' : 'bg-[#FAF5EA] text-ink-black hover:bg-white'
                  }`}
                >
                  <div className="text-lg font-bold">⚡ FRIENDLY MATCH</div>
                  <div className="font-body-md text-xs text-on-surface-variant font-bold mt-1">
                    Standard custom room, flexible brawlers.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchType('power_league')}
                  className={`p-4 border-2 border-ink-black font-headline-sm text-sm uppercase text-left transition-all cursor-pointer shadow-tape ${
                    matchType === 'power_league' ? 'bg-scream-yellow text-ink-black rotate-1 font-bold' : 'bg-[#FAF5EA] text-ink-black hover:bg-white'
                  }`}
                >
                  <div className="text-lg font-bold">🏆 POWER LEAGUE</div>
                  <div className="font-body-md text-xs text-on-surface-variant font-bold mt-1">
                    Pick/ban format, ranked tournament prep.
                  </div>
                </button>
              </div>
            </div>

            {/* Slots & Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">2. TOTAL SLOTS</label>
                <select
                  value={slotCount}
                  onChange={(e) => setSlotCount(Number(e.target.value))}
                  className="bg-[#FAF5EA] border-2 border-ink-black font-headline-sm text-base p-2.5 focus:bg-scream-yellow/20 focus:outline-none font-bold"
                >
                  <option value={2}>2 Players (1v1)</option>
                  <option value={6}>6 Players (3v3 Full Team)</option>
                  <option value={10}>10 Players (5v5 / Custom)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">3. HOST AS TEAM (OPTIONAL)</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="bg-[#FAF5EA] border-2 border-ink-black font-headline-sm text-base p-2.5 focus:bg-scream-yellow/20 focus:outline-none font-bold"
                >
                  <option value="">Personal / Individual</option>
                  {userTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag || 'TEAM'}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">4. DATE</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-2.5 focus:bg-scream-yellow/20 focus:outline-none font-bold text-ink-black"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">5. START TIME</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-2.5 focus:bg-scream-yellow/20 focus:outline-none font-bold text-ink-black"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t-2 border-dashed border-ink-black/30">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-battle-red text-white py-3.5 px-8 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer font-bold tracking-wider"
              >
                NEXT: MAP ROTATION →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Map Set Selection */}
        {step === 2 && (
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform -rotate-1 flex flex-col gap-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            <div className="flex justify-between items-center border-b-2 border-dashed border-ink-black/40 pb-3">
              <div>
                <h2 className="font-headline-sm text-xl uppercase text-ink-black font-bold">DRAFT MAP SET</h2>
                <p className="font-body-md text-xs text-on-surface-variant font-bold">
                  Select 1 to 5 maps from the live Brawl Stars rotation.
                </p>
              </div>
              <span className="bg-scream-yellow text-ink-black px-3 py-1 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-tape font-bold">
                {selectedMaps.length} SELECTED
              </span>
            </div>

            {loadingMaps ? (
              <div className="py-12 text-center font-headline-sm text-lg uppercase animate-pulse text-ink-black font-bold">
                LOADING LIVE MAPS...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto p-2">
                {availableMaps.map((mapItem) => {
                  const isSelected = selectedMaps.some((m) => m.id === mapItem.id)
                  const mapIdx = selectedMaps.findIndex((m) => m.id === mapItem.id)

                  return (
                    <button
                      key={mapItem.id}
                      type="button"
                      onClick={() => handleMapToggle(mapItem)}
                      className={`border-2 border-ink-black p-3 text-left flex flex-col gap-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-scream-yellow text-ink-black shadow-hard scale-102 z-10 font-bold'
                          : 'bg-[#FAF5EA] text-ink-black hover:bg-white shadow-tape'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-battle-red text-white text-xs font-headline-sm w-6 h-6 rounded-full flex items-center justify-center border border-ink-black shadow-tape font-bold">
                          {mapIdx + 1}
                        </div>
                      )}

                      <div className="w-full h-24 bg-ink-black/10 border border-ink-black overflow-hidden relative">
                        <img
                          src={mapItem.imageUrl}
                          alt={mapItem.map_name || mapItem.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://cdn.brawlify.com/maps/regular/15000007.png'
                          }}
                        />
                      </div>

                      <div>
                        <span className="bg-white px-2 py-0.5 border border-ink-black text-[10px] font-label-bold uppercase font-bold text-ink-black">
                          {mapItem.mode || '3V3'}
                        </span>
                        <div className="font-headline-sm text-sm uppercase truncate mt-1 text-ink-black font-bold">
                          {mapItem.map_name || mapItem.name}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t-2 border-dashed border-ink-black/30">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-[#FAF5EA] text-ink-black py-3 px-6 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-hard-sm hover:bg-white font-bold"
              >
                ← BACK
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-battle-red text-white py-3.5 px-8 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer font-bold tracking-wider"
              >
                NEXT: REVIEW & HOST →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Host */}
        {step === 3 && (
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform rotate-1 flex flex-col gap-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            <h2 className="font-headline-sm text-xl uppercase border-b-2 border-dashed border-ink-black pb-2 text-ink-black font-bold">
              REVIEW SCRIM SUMMARY
            </h2>

            <div className="grid grid-cols-2 gap-4 bg-paper-cream p-4 border-2 border-ink-black shadow-tape">
              <div>
                <span className="font-label-bold text-xs uppercase text-on-surface-variant block font-bold">
                  Format
                </span>
                <span className="font-headline-sm text-base uppercase text-ink-black font-bold">
                  {matchType === 'friendly' ? 'Friendly · 3v3' : 'Power League · Ranked'}
                </span>
              </div>
              <div>
                <span className="font-label-bold text-xs uppercase text-on-surface-variant block font-bold">
                  Slots
                </span>
                <span className="font-headline-sm text-base uppercase text-ink-black font-bold">{slotCount} Players</span>
              </div>
              <div>
                <span className="font-label-bold text-xs uppercase text-on-surface-variant block font-bold">
                  Date & Time
                </span>
                <span className="font-headline-sm text-base uppercase text-ink-black font-bold">
                  {scheduledDate} @ {scheduledTime}
                </span>
              </div>
              <div>
                <span className="font-label-bold text-xs uppercase text-on-surface-variant block font-bold">
                  Map Rotation
                </span>
                <span className="font-headline-sm text-base uppercase text-ink-black font-bold">
                  {selectedMaps.length} Maps Selected
                </span>
              </div>
            </div>

            {/* Optional Host Notes */}
            <div className="flex flex-col gap-2">
              <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">LOBBY NOTES / RULES</label>
              <textarea
                rows="2"
                placeholder="e.g. Power 11 required, discord call ready, best of 3."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-3 focus:bg-scream-yellow/20 focus:outline-none resize-none font-medium text-ink-black"
              />
            </div>

            <div className="flex justify-between pt-4 border-t-2 border-dashed border-ink-black/30">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-[#FAF5EA] text-ink-black py-3 px-6 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-hard-sm hover:bg-white font-bold"
              >
                ← BACK
              </button>

              <button
                type="button"
                onClick={handleCreateLobby}
                disabled={submitting}
                className="bg-battle-red text-white py-4 px-10 font-headline-lg text-lg uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer disabled:opacity-50 font-bold tracking-wider"
              >
                {submitting ? 'HOSTING LOBBY...' : 'LAUNCH SCRIM LOBBY ⚡'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
