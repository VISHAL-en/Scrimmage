import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import dayjs from 'dayjs'

export default function MatchHistory() {
  const { session } = useAuth()

  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'FRIENDLY' | 'POWER LEAGUE'

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchMatches = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            lobby_id,
            logged_by,
            created_at,
            profiles:logged_by ( display_name ),
            lobbies:lobby_id (
              id,
              type,
              scheduled_time,
              slot_count,
              host_id,
              notes,
              profiles:host_id ( id, display_name, main_brawler_name, main_brawler_icon_url ),
              teams:team_id ( id, name, tag ),
              lobby_maps ( id, map_name, mode, order_index ),
              lobby_participants ( profile_id, profiles ( id, display_name, main_brawler_icon_url ) )
            ),
            match_maps ( id, lobby_map_id, order_index, winner_label )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        const userMatches = (data || []).filter((m) => {
          if (!m.lobbies) return false
          const isHost = m.lobbies.host_id === session.user.id
          const isParticipant = (m.lobbies.lobby_participants || []).some(
            (p) => p.profile_id === session.user.id
          )
          return isHost || isParticipant
        })

        setMatches(userMatches)
      } catch (err) {
        console.error('Error fetching match history:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [session])

  const filteredMatches = matches.filter((m) => {
    if (filterTab === 'ALL') return true
    if (filterTab === 'FRIENDLY') return m.lobbies?.type === 'friendly'
    if (filterTab === 'POWER LEAGUE') return m.lobbies?.type === 'power_league'
    return true
  })

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Canvas */}
      <main className="flex-grow max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full relative z-10">
        
        {/* Header Section */}
        <header className="mb-10 relative">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>SCRIM COMBAT LOGS</span>
          </div>

          <h1
            className="text-display-xl font-display-xl text-battle-red uppercase tracking-tighter"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            MATCH <span className="text-scream-yellow">HISTORY.</span>
          </h1>

          <p className="font-body-md text-ink-black max-w-xl mt-3 font-bold">
            Record of all logged scrim sets, map winners, and combat results.
          </p>
        </header>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-3 mb-10 items-center border-b-4 border-ink-black pb-4">
          {['ALL', 'FRIENDLY', 'POWER LEAGUE'].map((tab, idx) => {
            const isActive = filterTab === tab
            const rotation = idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-5 py-2 font-headline-sm text-xs uppercase border-2 border-ink-black shadow-tape transition-all cursor-pointer font-bold ${rotation} ${
                  isActive
                    ? 'bg-scream-yellow text-ink-black'
                    : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA]'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Match List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="font-headline-lg text-3xl uppercase animate-pulse text-ink-black">
              LOADING MATCH LOGS...
            </div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-12 text-center max-w-lg mx-auto transform -rotate-1 relative mt-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
            }}
          >
            <h3 className="font-headline-lg text-2xl uppercase text-battle-red mb-2 font-bold">
              No Matches Logged Yet
            </h3>
            <p className="font-body-md text-xs text-ink-black mb-6 font-bold">
              Complete a scrim lobby and use the "Log Results" button to record map winners.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/my-lobbies"
                className="bg-battle-red text-white font-headline-sm text-sm px-6 py-3.5 border-2 border-ink-black shadow-hard uppercase hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-bold tracking-wider"
              >
                CHECK MY LOBBIES ⚡
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredMatches.map((m, idx) => {
              const lobby = m.lobbies || {}
              const hostName = lobby.profiles?.display_name || 'HOST'
              const teamName = lobby.teams?.name
              const isFriendly = lobby.type === 'friendly'
              const dateStr = dayjs(lobby.scheduled_time || m.created_at).format('MMM D')
              const sortedMaps = [...(lobby.lobby_maps || [])].sort(
                (a, b) => (a.order_index || 0) - (b.order_index || 0)
              )
              const mapSummary = sortedMaps.map((sm) => sm.map_name).filter(Boolean).join(' · ')
              const rotation = idx % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'

              const mmWinners = (m.match_maps || []).map((mm) => mm.winner_label).filter(Boolean)
              const winnerCountMap = {}
              mmWinners.forEach((w) => {
                winnerCountMap[w] = (winnerCountMap[w] || 0) + 1
              })
              const topWinnerEntry = Object.entries(winnerCountMap).sort((a, b) => b[1] - a[1])[0]

              return (
                <article
                  key={m.id}
                  className={`bg-white border-2 border-ink-black shadow-hard p-6 relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transform ${rotation} hover:-translate-y-0.5 transition-transform`}
                  style={{
                    clipPath:
                      'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
                  }}
                >
                  {/* Left: Score/Winner Badge */}
                  <div className="bg-acid-green border-2 border-ink-black shadow-tape p-4 min-w-[120px] text-center transform -rotate-2 flex-shrink-0 font-bold">
                    <span className="text-headline-md font-headline-md uppercase text-ink-black block leading-none font-bold">
                      {topWinnerEntry ? `${topWinnerEntry[1]} WINS` : 'LOGGED'}
                    </span>
                    {topWinnerEntry && (
                      <span className="font-label-bold text-[10px] uppercase text-ink-black truncate max-w-[100px] block mt-1 font-bold">
                        {topWinnerEntry[0]}
                      </span>
                    )}
                  </div>

                  {/* Middle: Match Info */}
                  <div className="flex-1 md:border-l-2 md:border-dashed md:border-ink-black/40 md:pl-6 flex flex-col gap-2 overflow-hidden">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-headline-sm text-xl uppercase text-ink-black truncate font-bold">
                        {teamName ? `VS ${teamName}` : `VS ${hostName}`}
                      </h3>
                      <span
                        className={`text-xs font-label-bold px-2 py-0.5 border border-ink-black uppercase font-bold shadow-tape ${
                          isFriendly ? 'bg-scream-yellow text-ink-black' : 'bg-electric-blue text-white'
                        }`}
                      >
                        {isFriendly ? 'FRIENDLY' : 'POWER LEAGUE'}
                      </span>
                      <span className="text-on-surface-variant font-label-bold text-xs underline decoration-wavy font-bold">
                        {dateStr}
                      </span>
                    </div>

                    <div className="text-xs font-body-md text-on-surface-variant font-bold truncate">
                      🗺 {mapSummary || 'Custom Map Set'}
                    </div>
                  </div>

                  {/* Right: View Match CTA */}
                  <Link
                    to={`/match/${m.id}`}
                    className="bg-scream-yellow text-ink-black border-2 border-ink-black shadow-tape px-6 py-2.5 font-headline-sm text-sm uppercase hover:bg-white transition-all flex-shrink-0 transform rotate-1 self-end md:self-center font-bold tracking-wider"
                  >
                    VIEW MATCH →
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
