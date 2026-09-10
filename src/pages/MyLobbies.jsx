import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import LobbyCard from '../components/LobbyCard'

export default function MyLobbies() {
  const { session } = useAuth()
  const [tab, setTab] = useState('hosting') // 'hosting' | 'joined'
  const [hostedLobbies, setHostedLobbies] = useState([])
  const [joinedLobbies, setJoinedLobbies] = useState([])
  const [matchesByLobby, setMatchesByLobby] = useState(new Map())
  const [loading, setLoading] = useState(true)

  const fetchMyLobbies = async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      // 1. Fetch Hosted Lobbies
      const { data: hostedData, error: hostedErr } = await supabase
        .from('lobbies')
        .select(`
          id,
          type,
          scheduled_time,
          slot_count,
          status,
          notes,
          host_id,
          profiles:host_id ( display_name, main_brawler_name, main_brawler_icon_url ),
          lobby_maps ( map_name, mode, order_index ),
          lobby_participants ( count )
        `)
        .eq('host_id', session.user.id)
        .order('scheduled_time', { ascending: false })

      if (hostedErr) throw hostedErr
      setHostedLobbies(hostedData || [])

      // 2. Fetch Joined Lobbies via lobby_participants
      const { data: joinedData, error: joinedErr } = await supabase
        .from('lobby_participants')
        .select(`
          lobby_id,
          joined_at,
          lobbies:lobby_id (
            id,
            type,
            scheduled_time,
            slot_count,
            status,
            notes,
            host_id,
            profiles:host_id ( display_name, main_brawler_name, main_brawler_icon_url ),
            lobby_maps ( map_name, mode, order_index ),
            lobby_participants ( count )
          )
        `)
        .eq('profile_id', session.user.id)
        .order('joined_at', { ascending: false })

      if (joinedErr) throw joinedErr

      const extractedJoined = (joinedData || [])
        .map((item) => item.lobbies)
        .filter(Boolean)
        .filter((l) => l.host_id !== session.user.id)

      setJoinedLobbies(extractedJoined)

      // 3. Fetch logged matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, lobby_id')

      if (matchesData) {
        const mapping = new Map()
        matchesData.forEach((m) => mapping.set(m.lobby_id, m.id))
        setMatchesByLobby(mapping)
      }
    } catch (err) {
      console.error('Error fetching my lobbies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyLobbies()
  }, [session])

  const partitionLobbies = (lobbyList) => {
    const now = new Date().getTime()
    const upcoming = []
    const past = []

    lobbyList.forEach((lobby) => {
      const scheduledTimeMs = new Date(lobby.scheduled_time).getTime()
      const isPastTime = scheduledTimeMs < now
      const isClosedStatus = lobby.status === 'cancelled' || lobby.status === 'completed'

      if (isClosedStatus || isPastTime) {
        past.push(lobby)
      } else {
        upcoming.push(lobby)
      }
    })

    return { upcoming, past }
  }

  const activeLobbyList = tab === 'hosting' ? hostedLobbies : joinedLobbies
  const { upcoming, past } = partitionLobbies(activeLobbyList)

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Canvas */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 relative z-10 flex flex-col gap-10">
        {/* Header & Tabs */}
        <header className="flex flex-col gap-6 relative">
          <div className="flex flex-wrap items-center gap-3 transform -rotate-1">
            <h1
              className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase tracking-tighter text-battle-red leading-none"
              style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
            >
              MY <span className="text-scream-yellow">LOBBIES.</span>
            </h1>
          </div>

          {/* Tab Controls */}
          <div className="flex flex-wrap gap-4 items-end mt-4 border-b-4 border-ink-black pb-3 relative">
            <button
              type="button"
              onClick={() => setTab('hosting')}
              className={`relative px-8 py-3 font-headline-sm text-sm uppercase transition-all border-2 border-ink-black shadow-tape cursor-pointer font-bold ${
                tab === 'hosting'
                  ? 'bg-scream-yellow text-ink-black -rotate-1'
                  : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA] rotate-1'
              }`}
            >
              HOSTING ({hostedLobbies.length})
            </button>

            <button
              type="button"
              onClick={() => setTab('joined')}
              className={`relative px-8 py-3 font-headline-sm text-sm uppercase transition-all border-2 border-ink-black shadow-tape cursor-pointer font-bold ${
                tab === 'joined'
                  ? 'bg-scream-yellow text-ink-black rotate-1'
                  : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA] -rotate-1'
              }`}
            >
              JOINED ({joinedLobbies.length})
            </button>
          </div>
        </header>

        {/* Content Body */}
        {loading ? (
          <div className="py-20 text-center font-headline-lg text-3xl animate-pulse uppercase text-ink-black">
            LOADING LOBBIES...
          </div>
        ) : activeLobbyList.length === 0 ? (
          <div
            className="w-full max-w-lg mx-auto text-center py-16 px-8 bg-white border-2 border-ink-black shadow-hard transform rotate-1 mt-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
            }}
          >
            <h3 className="font-headline-md text-2xl uppercase mb-2 text-battle-red font-bold">
              {tab === 'hosting' ? 'No Hosted Scrims' : 'No Joined Scrims'}
            </h3>
            <p className="font-body-md text-xs text-ink-black mb-6 font-bold">
              {tab === 'hosting'
                ? "You haven't hosted any scrims yet. Set up a custom lobby and invite players!"
                : "You haven't joined any active scrims yet. Browse the open lobby board to jump in."}
            </p>

            {tab === 'hosting' ? (
              <Link
                to="/create-lobby"
                className="inline-block bg-battle-red text-white font-headline-sm text-sm uppercase px-8 py-3 border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all transform -rotate-1 font-bold tracking-wider"
              >
                + HOST A LOBBY ⚡
              </Link>
            ) : (
              <Link
                to="/board"
                className="inline-block bg-scream-yellow text-ink-black font-headline-sm text-sm uppercase px-8 py-3 border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all transform rotate-1 font-bold tracking-wider"
              >
                BROWSE LOBBY BOARD →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {/* UPCOMING SECTION */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b-4 border-ink-black pb-2">
                <span className="font-headline-lg text-headline-lg uppercase text-ink-black tracking-tight font-bold">
                  UPCOMING
                </span>
                <span className="bg-acid-green text-ink-black border-2 border-ink-black px-2.5 py-0.5 text-xs font-headline-sm font-bold shadow-tape">
                  {upcoming.length}
                </span>
              </div>

              {upcoming.length === 0 ? (
                <div className="p-6 bg-white border-2 border-dashed border-ink-black text-center font-label-bold text-ink-black uppercase font-bold text-xs">
                  No upcoming {tab === 'hosting' ? 'hosted' : 'joined'} lobbies.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {upcoming.map((lobbyItem, idx) => (
                    <LobbyCard
                      key={lobbyItem.id}
                      lobby={lobbyItem}
                      index={idx}
                      actionText={tab === 'hosting' ? 'MANAGE' : 'VIEW'}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* PAST SECTION */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b-4 border-ink-black pb-2">
                <span className="font-headline-lg text-headline-lg uppercase text-ink-black tracking-tight font-bold">
                  PAST
                </span>
                <span className="bg-paper-cream text-ink-black border-2 border-ink-black px-2.5 py-0.5 text-xs font-headline-sm font-bold shadow-tape">
                  {past.length}
                </span>
              </div>

              {past.length === 0 ? (
                <div className="p-6 bg-white border-2 border-dashed border-ink-black text-center font-label-bold text-ink-black uppercase font-bold text-xs">
                  No past {tab === 'hosting' ? 'hosted' : 'joined'} lobbies yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {past.map((lobbyItem, idx) => {
                    const matchId = matchesByLobby.get(lobbyItem.id)
                    const showUnlogged =
                      tab === 'hosting' && !matchId && lobbyItem.status !== 'cancelled'
                    return (
                      <LobbyCard
                        key={lobbyItem.id}
                        lobby={lobbyItem}
                        index={idx}
                        actionText="DETAILS"
                        showUnloggedResults={showUnlogged}
                        matchId={matchId}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          to="/create-lobby"
          className="bg-battle-red text-white border-2 border-ink-black font-headline-sm text-sm px-6 py-3.5 shadow-hard transform -rotate-2 hover:rotate-0 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2 uppercase font-bold tracking-wider"
        >
          <span>⚡</span>
          <span>HOST A LOBBY</span>
        </Link>
      </div>
    </div>
  )
}
