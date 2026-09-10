import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import LobbyCard from '../components/LobbyCard'
import JoinByCode from '../components/JoinByCode'

export default function Dashboard() {
  const { session, profile } = useAuth()
  const [openLobbies, setOpenLobbies] = useState([])
  const [myLobbies, setMyLobbies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const { data: openData } = await supabase
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
          .limit(6)

        setOpenLobbies(openData || [])

        if (session?.user?.id) {
          const { data: userLobbies } = await supabase
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
            .eq('host_id', session.user.id)
            .order('scheduled_time', { ascending: false })
            .limit(3)

          setMyLobbies(userLobbies || [])
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [session])

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-10 w-full relative z-10 flex flex-col gap-12">
        
        {/* Hero Section */}
        <section className="relative pt-4 pb-2">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="relative z-10 max-w-2xl transform -rotate-1">
              {/* Scrim Tape Badge */}
              <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-3 w-max shadow-tape mb-4 flex items-center gap-1.5 font-bold">
                <span className="text-battle-red font-bold">⚡</span>
                <span>COMPETITIVE SCRIM MATCHMAKING</span>
              </div>

              <h1
                className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase tracking-tighter text-battle-red leading-none"
                style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
              >
                RUN YOUR <span className="text-scream-yellow">SETS.</span>
              </h1>

              <p className="font-body-lg text-body-lg text-ink-black font-bold max-w-lg mt-5 border-l-4 border-ink-black pl-4">
                Host custom lobbies, draft map rotations, find competitive 3v3 scrims, and track match histories.
              </p>
            </div>

            {/* Quick Actions Card */}
            <div
              className="bg-white border-2 border-ink-black shadow-hard p-6 w-full md:w-80 transform rotate-2 flex flex-col gap-4 relative"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
              }}
            >
              <h2 className="font-headline-sm text-xl uppercase border-b-2 border-dashed border-ink-black pb-2 text-ink-black font-bold">
                QUICK ACTIONS
              </h2>

              <Link
                to="/create-lobby"
                className="bg-battle-red text-white py-3.5 px-4 font-headline-sm text-sm uppercase text-center border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all block font-bold tracking-wider"
              >
                + HOST A SCRIM ⚡
              </Link>

              <Link
                to="/board"
                className="bg-scream-yellow text-ink-black py-3.5 px-4 font-headline-sm text-sm uppercase text-center border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all block font-bold tracking-wider"
              >
                BROWSE OPEN LOBBIES →
              </Link>

              <Link
                to="/teams/new"
                className="bg-[#FAF5EA] text-ink-black py-2.5 px-4 font-headline-sm text-xs uppercase text-center border-2 border-ink-black shadow-tape hover:bg-white transition-all block font-bold"
              >
                CREATE SQUAD / TEAM
              </Link>

              <div className="pt-2 border-t-2 border-dashed border-ink-black flex flex-col gap-1.5">
                <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">
                  JOIN VIA CODE:
                </span>
                <JoinByCode placeholder="6-DIGIT CODE" compact={true} />
              </div>
            </div>
          </div>
        </section>

        {/* Section: Open Lobbies */}
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-center border-b-4 border-ink-black pb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-headline-lg text-headline-lg uppercase text-ink-black tracking-tight">
                LIVE SCRIM BOARDS
              </h2>
              <span className="bg-acid-green text-ink-black px-2.5 py-0.5 text-xs font-headline-sm uppercase border-2 border-ink-black shadow-tape font-bold">
                OPEN
              </span>
            </div>

            <Link
              to="/board"
              className="font-headline-sm text-xs uppercase underline hover:text-battle-red font-bold"
            >
              VIEW ALL ({openLobbies.length}) →
            </Link>
          </div>

          {loading ? (
            <div className="py-20 text-center font-headline-lg text-3xl uppercase animate-pulse">
              LOADING SCRIM LOBBIES...
            </div>
          ) : openLobbies.length === 0 ? (
            <div
              className="p-10 bg-white border-2 border-ink-black shadow-hard text-center max-w-lg mx-auto transform rotate-1"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
              }}
            >
              <h3 className="font-headline-sm text-2xl uppercase text-battle-red mb-2 font-bold">
                NO OPEN LOBBIES RIGHT NOW
              </h3>
              <p className="font-body-md text-xs text-ink-black font-bold mb-6">
                Be the first to create a scrim lobby and start matching with competitive players.
              </p>
              <Link
                to="/create-lobby"
                className="bg-battle-red text-white py-3 px-6 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard inline-block font-bold tracking-wider"
              >
                + HOST LOBBY NOW ⚡
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {openLobbies.map((lobby, idx) => (
                <LobbyCard key={lobby.id} lobby={lobby} index={idx} actionText="JOIN" />
              ))}
            </div>
          )}
        </section>

        {/* Section: User's Hosted Lobbies */}
        {session && myLobbies.length > 0 && (
          <section className="flex flex-col gap-6 pt-4">
            <div className="flex justify-between items-center border-b-4 border-ink-black pb-3">
              <h2 className="font-headline-lg text-headline-lg uppercase text-ink-black">
                YOUR HOSTED SCRIMS
              </h2>
              <Link
                to="/my-lobbies"
                className="font-headline-sm text-xs uppercase underline hover:text-battle-red font-bold"
              >
                MY LOBBIES →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myLobbies.map((lobby, idx) => (
                <LobbyCard key={lobby.id} lobby={lobby} index={idx} actionText="MANAGE" />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
