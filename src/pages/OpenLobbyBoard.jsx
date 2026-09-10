import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import LobbyCard from '../components/LobbyCard'
import JoinByCode from '../components/JoinByCode'

export default function OpenLobbyBoard() {
  const [lobbies, setLobbies] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL') // 'ALL' | 'FRIENDLY' | 'POWER LEAGUE'
  const [slotFilter, setSlotFilter] = useState('ALL') // 'ALL' | 'OPEN' | 'FULL'

  const fetchLobbies = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('lobbies')
        .select(`
          id,
          type,
          scheduled_time,
          slot_count,
          status,
          notes,
          host_id,
          profiles:host_id ( id, display_name, main_brawler_name, main_brawler_icon_url ),
          teams:team_id ( id, name, tag ),
          lobby_maps ( map_name, mode, order_index ),
          lobby_participants ( count )
        `)
        .eq('status', 'open')
        .order('scheduled_time', { ascending: true })

      const { data, error } = await query
      if (error) throw error
      setLobbies(data || [])
    } catch (err) {
      console.error('Error fetching lobbies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLobbies()
  }, [])

  const filteredLobbies = lobbies.filter((l) => {
    if (typeFilter === 'FRIENDLY' && l.type !== 'friendly') return false
    if (typeFilter === 'POWER LEAGUE' && l.type !== 'power_league') return false

    const pCount =
      typeof l.lobby_participants === 'number'
        ? l.lobby_participants
        : Array.isArray(l.lobby_participants)
        ? l.lobby_participants.length
        : l.lobby_participants?.count ?? 0

    if (slotFilter === 'OPEN' && pCount >= l.slot_count) return false
    if (slotFilter === 'FULL' && pCount < l.slot_count) return false

    return true
  })

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full relative z-10 flex flex-col gap-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
              <span className="text-battle-red font-bold">⚡</span>
              <span>LIVE SCRIM ROTATION</span>
            </div>

            <h1
              className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase tracking-tighter text-battle-red leading-none"
              style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
            >
              OPEN <span className="text-scream-yellow">LOBBIES.</span>
            </h1>
          </div>

          <Link
            to="/create-lobby"
            className="bg-battle-red text-white py-3.5 px-6 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all transform -rotate-1 font-bold tracking-wider"
          >
            + HOST A SCRIM ⚡
          </Link>
        </header>

        {/* Filter & Join Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b-4 border-ink-black pb-4">
          {/* Filters (Type + Slots) */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Type Filters */}
            <div className="flex flex-wrap gap-2">
              {['ALL', 'FRIENDLY', 'POWER LEAGUE'].map((tab, idx) => {
                const active = typeFilter === tab
                const rotation = idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTypeFilter(tab)}
                    className={`px-4 py-2 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-tape transition-all cursor-pointer font-bold ${rotation} ${
                      active
                        ? 'bg-scream-yellow text-ink-black'
                        : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA]'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Slot Filters */}
            <div className="flex items-center gap-2">
              <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">Slots:</span>
              {['ALL', 'OPEN'].map((sTab) => {
                const active = slotFilter === sTab
                return (
                  <button
                    key={sTab}
                    type="button"
                    onClick={() => setSlotFilter(sTab)}
                    className={`px-3 py-1 font-headline-sm text-xs uppercase border border-ink-black cursor-pointer font-bold ${
                      active ? 'bg-ink-black text-white' : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA]'
                    }`}
                  >
                    {sTab}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Join Via Code */}
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold hidden sm:inline">
              JOIN VIA CODE:
            </span>
            <JoinByCode placeholder="6-DIGIT CODE" compact={false} />
          </div>
        </div>

        {/* Lobby Grid */}
        {loading ? (
          <div className="py-24 text-center font-headline-lg text-3xl uppercase animate-pulse">
            LOADING OPEN LOBBIES...
          </div>
        ) : filteredLobbies.length === 0 ? (
          <div
            className="p-12 bg-white border-2 border-ink-black shadow-hard text-center max-w-lg mx-auto transform rotate-1 mt-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
            }}
          >
            <h3 className="font-headline-sm text-2xl uppercase text-battle-red mb-2 font-bold">
              NO MATCHING LOBBIES
            </h3>
            <p className="font-body-md text-xs text-ink-black font-bold mb-6">
              There are no open scrims matching your selected filters.
            </p>
            <Link
              to="/create-lobby"
              className="bg-battle-red text-white py-3 px-6 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard inline-block font-bold tracking-wider"
            >
              + HOST NEW LOBBY ⚡
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {filteredLobbies.map((lobby, idx) => (
              <LobbyCard key={lobby.id} lobby={lobby} index={idx} actionText="JOIN" />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
