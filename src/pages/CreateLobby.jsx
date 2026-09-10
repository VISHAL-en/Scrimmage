import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import { getAllMaps, getModeInfo, MODE_CONFIG } from '../lib/maps'
import { formatActionError } from '../lib/authErrors'
import dayjs from 'dayjs'
import { Search, X, Check, MapPin, Trophy } from 'lucide-react'

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

  // Map Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMode, setActiveMode] = useState('All')

  // Data State
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

  // 1. Calculate map count per mode
  const modeCounts = useMemo(() => {
    const counts = {}
    availableMaps.forEach((m) => {
      const mode = m.mode || 'Custom'
      counts[mode] = (counts[mode] || 0) + 1
    })
    return counts
  }, [availableMaps])

  // 2. Filter available maps by search and active mode
  const filteredMaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return availableMaps.filter((m) => {
      const mapName = (m.map_name || m.name || '').toLowerCase()
      const mapMode = (m.mode || '').toLowerCase()

      const matchesSearch = !q || mapName.includes(q) || mapMode.includes(q)
      const matchesMode = activeMode === 'All' || m.mode === activeMode

      return matchesSearch && matchesMode
    })
  }, [availableMaps, searchQuery, activeMode])

  // 3. Group filtered maps by game mode in structured sections
  const groupedModeSections = useMemo(() => {
    const groups = {}
    filteredMaps.forEach((mapItem) => {
      const mode = mapItem.mode || 'Custom'
      if (!groups[mode]) {
        groups[mode] = []
      }
      groups[mode].push(mapItem)
    })

    const priorityOrder = [
      'Knockout',
      'Bounty',
      'Gem Grab',
      'Brawl Ball',
      'Hot Zone',
      'Heist',
      'Wipeout',
      'Duels',
      'Siege',
      'Showdown',
      'Custom'
    ]

    return Object.keys(groups)
      .sort((a, b) => {
        const idxA = priorityOrder.indexOf(a)
        const idxB = priorityOrder.indexOf(b)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.localeCompare(b)
      })
      .map((mode) => ({
        mode,
        modeInfo: getModeInfo(mode),
        maps: groups[mode]
      }))
  }, [filteredMaps])

  // Available filter modes list
  const filterModes = useMemo(() => {
    const uniqueModes = Array.from(new Set(availableMaps.map((m) => m.mode || 'Custom')))
    const priorityOrder = [
      'Knockout',
      'Bounty',
      'Gem Grab',
      'Brawl Ball',
      'Hot Zone',
      'Heist',
      'Wipeout',
      'Duels',
      'Siege',
      'Showdown',
      'Custom'
    ]
    return uniqueModes.sort((a, b) => {
      const idxA = priorityOrder.indexOf(a)
      const idxB = priorityOrder.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [availableMaps])

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
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black bg-paper-cream">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-12 w-full">
        {/* Title */}
        <div className="mb-8 relative">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>HOST SCRIM SETUP</span>
          </div>

          <h1
            className="font-display-xl text-4xl sm:text-6xl md:text-7xl uppercase tracking-tighter text-battle-red leading-none"
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
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform rotate-0.5 flex flex-col gap-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 98%, 95% 100%, 90% 98%, 85% 100%, 80% 98%, 75% 100%, 70% 98%, 65% 100%, 60% 98%, 55% 100%, 50% 98%, 45% 100%, 40% 98%, 35% 100%, 30% 98%, 25% 100%, 20% 98%, 15% 100%, 10% 98%, 5% 100%, 0 98%)'
            }}
          >
            {/* Match Type */}
            <div className="flex flex-col gap-2">
              <label className="font-headline-sm text-sm uppercase text-ink-black font-bold">1. MATCH TYPE</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* STEP 2: Enhanced Map Rotation Selector with Search, Filter Tabs & Grouped Mode Sections */}
        {step === 2 && (
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform rotate-0 flex flex-col gap-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 98%, 95% 100%, 90% 98%, 85% 100%, 80% 98%, 75% 100%, 70% 98%, 65% 100%, 60% 98%, 55% 100%, 50% 98%, 45% 100%, 40% 98%, 35% 100%, 30% 98%, 25% 100%, 20% 98%, 15% 100%, 10% 98%, 5% 100%, 0 98%)'
            }}
          >
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-dashed border-ink-black/40 pb-4">
              <div>
                <h2 className="font-headline-sm text-2xl uppercase text-ink-black font-bold">DRAFT MAP SET</h2>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold">
                  Select 1 to 7 maps from the live rotation. Search or filter by game mode.
                </p>
              </div>
              <span className={`px-3.5 py-1.5 font-headline-sm text-xs sm:text-sm uppercase border-2 border-ink-black shadow-tape font-bold ${
                selectedMaps.length > 0 ? 'bg-scream-yellow text-ink-black -rotate-1' : 'bg-paper-cream text-on-surface-variant'
              }`}>
                {selectedMaps.length} / 7 SELECTED
              </span>
            </div>

            {/* Selected Maps Tray (Shows drafted order) */}
            {selectedMaps.length > 0 && (
              <div className="bg-paper-cream border-2 border-ink-black p-3.5 shadow-hard-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-headline-sm text-xs uppercase text-ink-black font-bold flex items-center gap-1.5">
                    <span className="text-battle-red">⚡</span>
                    SELECTED DRAFT ORDER ({selectedMaps.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMaps([])}
                    className="text-[11px] font-label-bold uppercase text-battle-red hover:underline font-bold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedMaps.map((m, idx) => {
                    const modeInfo = getModeInfo(m.mode)
                    return (
                      <div
                        key={m.id}
                        className="bg-white border-2 border-ink-black px-2.5 py-1 flex items-center gap-2 shadow-tape text-xs font-headline-sm uppercase font-bold"
                      >
                        <span className="bg-battle-red text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[140px] text-ink-black">{m.map_name || m.name}</span>
                        <span className="text-[10px] text-on-surface-variant font-medium">({modeInfo.icon})</span>
                        <button
                          type="button"
                          onClick={() => handleMapToggle(m)}
                          className="text-ink-black/50 hover:text-battle-red font-bold text-xs ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 1. Search Bar */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-black/60">
                <Search className="w-4 h-4 stroke-[2.5]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search maps (e.g. Belle's Rock, Goldarm, Shooting Star)..."
                className="w-full pl-10 pr-10 py-3 bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm text-ink-black font-bold placeholder-ink-black/50 focus:bg-scream-yellow/20 focus:outline-none shadow-tape"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-black hover:text-battle-red font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 2. Filter Tabs (Horizontal Chips) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 -mt-2">
              <button
                type="button"
                onClick={() => setActiveMode('All')}
                className={`px-3.5 py-1.5 border-2 border-ink-black font-headline-sm text-xs uppercase flex items-center gap-1.5 flex-shrink-0 cursor-pointer transition-all font-bold ${
                  activeMode === 'All'
                    ? 'bg-scream-yellow text-ink-black shadow-hard -rotate-1 font-black'
                    : 'bg-white text-on-surface-variant hover:text-ink-black hover:bg-[#FAF5EA] shadow-tape'
                }`}
              >
                <span>ALL</span>
                <span className="text-[10px] opacity-75 font-normal">({availableMaps.length})</span>
              </button>

              {filterModes.map((mode) => {
                const info = getModeInfo(mode)
                const count = modeCounts[mode] || 0
                const isActive = activeMode === mode

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={`px-3.5 py-1.5 border-2 border-ink-black font-headline-sm text-xs uppercase flex items-center gap-1.5 flex-shrink-0 cursor-pointer transition-all font-bold ${
                      isActive
                        ? 'bg-scream-yellow text-ink-black shadow-hard -rotate-1 font-black'
                        : 'bg-white text-on-surface-variant hover:text-ink-black hover:bg-[#FAF5EA] shadow-tape'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{mode}</span>
                    <span className="text-[10px] opacity-75 font-normal">({count})</span>
                  </button>
                )
              })}
            </div>

            {/* 3. Grouped Mode Sections & Map Cards */}
            {loadingMaps ? (
              <div className="py-16 text-center font-headline-sm text-lg uppercase animate-pulse text-ink-black font-bold">
                LOADING LIVE MAPS...
              </div>
            ) : groupedModeSections.length === 0 ? (
              <div className="py-12 bg-paper-cream border-2 border-dashed border-ink-black/40 text-center flex flex-col items-center justify-center p-6">
                <p className="font-headline-sm text-lg uppercase text-ink-black font-bold mb-1">
                  NO MAPS FOUND
                </p>
                <p className="font-body-md text-xs text-on-surface-variant font-medium mb-4">
                  No maps match "{searchQuery}" in {activeMode === 'All' ? 'any mode' : activeMode}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setActiveMode('All')
                  }}
                  className="bg-scream-yellow text-ink-black border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase font-bold shadow-tape hover:rotate-1"
                >
                  CLEAR SEARCH & FILTERS
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto p-1 pr-2">
                {groupedModeSections.map(({ mode, modeInfo, maps }) => (
                  <div key={mode} className="flex flex-col gap-3">
                    {/* Mode Header Banner */}
                    <div className="flex items-center justify-between border-b-2 border-ink-black pb-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{modeInfo.icon}</span>
                        <h3 className="font-headline-sm text-base uppercase text-ink-black font-bold tracking-wide">
                          {mode}
                        </h3>
                        <span className="bg-paper-cream border border-ink-black px-2 py-0.5 text-[11px] font-label-bold font-bold shadow-tape">
                          {maps.length} {maps.length === 1 ? 'MAP' : 'MAPS'}
                        </span>
                      </div>
                    </div>

                    {/* Responsive Grid of Map Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {maps.map((mapItem) => {
                        const isSelected = selectedMaps.some((m) => m.id === mapItem.id)
                        const mapIdx = selectedMaps.findIndex((m) => m.id === mapItem.id)

                        return (
                          <button
                            key={mapItem.id}
                            type="button"
                            onClick={() => handleMapToggle(mapItem)}
                            className={`border-2 border-ink-black p-3 text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer relative group ${
                              isSelected
                                ? 'bg-scream-yellow text-ink-black shadow-hard scale-[1.02] z-10 font-bold -rotate-0.5'
                                : 'bg-[#FAF5EA] text-ink-black hover:bg-white shadow-tape hover:-translate-y-0.5'
                            }`}
                          >
                            {/* Selected Order Badge */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-battle-red text-white text-xs font-headline-sm w-6 h-6 rounded-full flex items-center justify-center border border-ink-black shadow-tape font-bold z-20">
                                {mapIdx + 1}
                              </div>
                            )}

                            {/* Map Image Thumbnail */}
                            <div className="w-full h-28 bg-ink-black/10 border border-ink-black overflow-hidden relative">
                              <img
                                src={mapItem.imageUrl}
                                alt={mapItem.map_name || mapItem.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.target.src = 'https://cdn.brawlify.com/maps/regular/15000007.png'
                                }}
                              />
                            </div>

                            {/* Map Name & Mode Badge */}
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`px-2 py-0.5 border border-ink-black text-[10px] font-label-bold uppercase font-bold ${
                                  isSelected ? 'bg-white text-ink-black' : 'bg-paper-cream text-ink-black'
                                }`}>
                                  {modeInfo.icon} {mapItem.mode || '3V3'}
                                </span>
                              </div>

                              <div className="font-headline-sm text-sm uppercase truncate text-ink-black font-bold tracking-tight">
                                {mapItem.map_name || mapItem.name}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 Bottom Navigation Controls */}
            <div className="flex justify-between pt-4 border-t-2 border-dashed border-ink-black/30">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-[#FAF5EA] text-ink-black py-3 px-6 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-hard-sm hover:bg-white font-bold cursor-pointer"
              >
                ← BACK
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedMaps.length === 0) {
                    alert('Please select at least 1 map for your rotation.')
                    return
                  }
                  setStep(3)
                }}
                className="bg-battle-red text-white py-3.5 px-8 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer font-bold tracking-wider"
              >
                NEXT: REVIEW & HOST ({selectedMaps.length}) →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Host */}
        {step === 3 && (
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform rotate-0.5 flex flex-col gap-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 98%, 95% 100%, 90% 98%, 85% 100%, 80% 98%, 75% 100%, 70% 98%, 65% 100%, 60% 98%, 55% 100%, 50% 98%, 45% 100%, 40% 98%, 35% 100%, 30% 98%, 25% 100%, 20% 98%, 15% 100%, 10% 98%, 5% 100%, 0 98%)'
            }}
          >
            <h2 className="font-headline-sm text-xl uppercase border-b-2 border-dashed border-ink-black pb-2 text-ink-black font-bold">
              REVIEW SCRIM SUMMARY
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-paper-cream p-4 border-2 border-ink-black shadow-tape">
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

            {/* Selected Map Set Preview */}
            {selectedMaps.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="font-headline-sm text-xs uppercase text-ink-black font-bold">
                  DRAFTED MAP ROTATION:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {selectedMaps.map((m, idx) => {
                    const info = getModeInfo(m.mode)
                    return (
                      <div
                        key={m.id}
                        className="bg-[#FAF5EA] border-2 border-ink-black p-2 flex items-center gap-2.5 shadow-tape"
                      >
                        <span className="bg-battle-red text-white text-xs font-headline-sm w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="overflow-hidden">
                          <div className="text-xs font-headline-sm uppercase truncate text-ink-black font-bold">
                            {m.map_name || m.name}
                          </div>
                          <span className="text-[10px] font-label-bold uppercase text-on-surface-variant">
                            {info.icon} {m.mode || '3V3'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
                className="bg-[#FAF5EA] text-ink-black py-3 px-6 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-hard-sm hover:bg-white font-bold cursor-pointer"
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
