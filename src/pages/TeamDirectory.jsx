import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import { getTeamBannerUrl } from '../lib/brawlers'

export default function TeamDirectory() {
  const { session } = useAuth()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'ACTIVE' | 'LOOKING FOR PLAYERS'
  const [userTeamCount, setUserTeamCount] = useState(0)

  useEffect(() => {
    fetchTeams()
    if (session?.user?.id) {
      supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .in('role', ['owner', 'member'])
        .then(({ count }) => {
          setUserTeamCount(count || 0)
        })
    }
  }, [session?.user?.id])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            profile_id,
            role
          )
        `)
        .order('created_at', { ascending: false })

      if (teamsError) throw teamsError

      const formatted = (teamsData || []).map((t) => {
        const approvedMembers = (t.team_members || []).filter(
          (m) => m.role === 'member' || m.role === 'owner'
        )
        return {
          ...t,
          memberCount: approvedMembers.length
        }
      })

      setTeams(formatted)
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTeams = teams.filter((t) => {
    const matchesSearch =
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.tag || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (filterTab === 'LOOKING FOR PLAYERS') {
      return t.memberCount < 6
    }
    if (filterTab === 'ACTIVE') {
      return t.memberCount >= 3
    }
    return true
  })

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pt-12 pb-24 w-full relative z-10">
        {/* Title Section */}
        <div className="mb-10 relative">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>TEAM SQUAD DIRECTORY</span>
          </div>

          <h1
            className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase tracking-tighter text-battle-red leading-none"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            FIND YOUR <span className="text-scream-yellow">CREW.</span>
          </h1>
        </div>

        {/* Search & Filter Controls */}
        <div className="mb-10 flex flex-col md:flex-row gap-6 items-start md:items-end justify-between relative z-10 border-b-4 border-ink-black pb-4">
          <div className="w-full md:w-1/2 relative">
            <input
              id="team-search"
              type="text"
              placeholder="Search teams, tags, or bios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FAF5EA] border-2 border-ink-black py-3 px-4 font-body-md text-sm text-ink-black focus:bg-scream-yellow/20 focus:outline-none transition-colors placeholder-on-surface-variant/60 font-bold shadow-tape"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            {['ALL', 'ACTIVE', 'LOOKING FOR PLAYERS'].map((tabName, idx) => {
              const active = filterTab === tabName
              const rotation = idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
              return (
                <button
                  key={tabName}
                  type="button"
                  onClick={() => setFilterTab(tabName)}
                  className={`border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-tape transition-all cursor-pointer font-bold ${rotation} ${
                    active
                      ? 'bg-scream-yellow text-ink-black'
                      : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA]'
                  }`}
                >
                  {tabName}
                </button>
              )
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center font-headline-lg text-3xl animate-pulse uppercase text-ink-black">
            LOADING TEAMS...
          </div>
        ) : filteredTeams.length === 0 ? (
          <div
            className="w-full max-w-lg mx-auto text-center py-16 px-8 bg-white border-2 border-ink-black shadow-hard transform rotate-1 mt-6"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
            }}
          >
            <h3 className="font-headline-md text-2xl uppercase mb-2 text-battle-red font-bold">
              NO TEAMS YET — BE THE FIRST TO CREATE ONE
            </h3>
            <p className="font-body-md text-xs text-ink-black mb-6 font-bold">
              Form your competitive Brawl Stars squad, build your roster, and host official team scrims.
            </p>
            <Link
              to="/teams/new"
              className="inline-block bg-battle-red text-white font-headline-sm text-sm uppercase px-8 py-3.5 border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all transform -rotate-1 font-bold tracking-wider"
            >
              + CREATE A TEAM ⚡
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 pb-12 relative z-0">
            {filteredTeams.map((teamItem, idx) => {
              const rotation =
                idx % 3 === 0 ? 'rotate-1' : idx % 3 === 1 ? '-rotate-2' : 'rotate-2'
              const isLooking = teamItem.memberCount < 6
              const statusText = isLooking ? 'LOOKING FOR PLAYERS' : 'ROSTER FULL'
              const statusBg = isLooking ? 'bg-electric-blue text-white' : 'bg-acid-green text-ink-black'

              const bannerStyle = teamItem.banner_url
                ? {
                    backgroundImage: `url(${teamItem.banner_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }
                : {
                    backgroundColor: idx % 2 === 0 ? '#FFC700' : '#181716'
                  }

              return (
                <article
                  key={teamItem.id}
                  className={`bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col gap-4 relative transform ${rotation} hover:-translate-y-1 hover:rotate-0 transition-all duration-300 z-10`}
                  style={{
                    clipPath:
                      'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
                  }}
                >
                  {/* Scrim Tape Corner Badge */}
                  <div className="absolute -top-3 -left-3 bg-scream-yellow text-ink-black border-2 border-ink-black px-2.5 py-0.5 font-headline-sm text-xs uppercase -rotate-6 shadow-tape z-20 flex items-center gap-1 font-bold">
                    <span className="text-battle-red font-bold">⚡</span>
                    <span>TEAM</span>
                  </div>

                  {/* Banner Image Area with Overlaid Team Name and Tag */}
                  <div className="w-full h-36 border-b-2 border-ink-black border-dashed relative overflow-hidden flex flex-col justify-between p-3 bg-ink-black">
                    {getTeamBannerUrl(teamItem) && (
                      <img
                        src={getTeamBannerUrl(teamItem)}
                        alt={teamItem.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20"></div>

                    <div className="relative z-10 flex justify-end">
                      <span className="font-label-bold text-[10px] uppercase text-white bg-ink-black/80 px-2 py-0.5 border border-white/30 backdrop-blur-sm font-bold shadow-tape">
                        EST. {new Date(teamItem.created_at).getFullYear()}
                      </span>
                    </div>

                    {/* Overlaid Team Name & Tag */}
                    <div className="relative z-10">
                      <h2
                        className="font-headline-lg text-2xl uppercase leading-none m-0 p-0 text-white truncate font-bold"
                        style={{
                          WebkitTextStroke: '1.5px #181716',
                          textShadow: '2px 2px 0px #181716'
                        }}
                        title={teamItem.name}
                      >
                        {teamItem.name}
                      </h2>
                      <span className="font-headline-sm text-xs text-scream-yellow uppercase font-bold tracking-wider">
                        {teamItem.tag
                          ? teamItem.tag.startsWith('[')
                            ? teamItem.tag
                            : `[${teamItem.tag}]`
                          : '[TEAM]'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Roster Count and Details */}
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">
                      ACTIVE SQUAD
                    </span>
                    <div className="px-2.5 py-1 border-2 border-ink-black rounded-full flex items-center justify-center bg-paper-cream shadow-tape transform rotate-1">
                      <span className="font-headline-sm text-xs leading-none font-bold text-ink-black">
                        {teamItem.memberCount}/6 ROSTER
                      </span>
                    </div>
                  </div>

                  {/* Description preview */}
                  {teamItem.description && (
                    <p className="font-body-md text-xs text-ink-black line-clamp-2 italic font-medium">
                      "{teamItem.description}"
                    </p>
                  )}

                  {/* Status Banner */}
                  <div
                    className={`${statusBg} border-2 border-ink-black px-3 py-1 text-xs font-label-bold uppercase text-center w-full mt-auto transform -rotate-1 font-bold shadow-tape`}
                  >
                    {statusText}
                  </div>

                  {/* CTA Button */}
                  <Link
                    to={`/team/${teamItem.id}`}
                    className="bg-scream-yellow text-ink-black border-2 border-ink-black py-2.5 font-headline-sm text-sm uppercase text-center mt-1 shadow-hard hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all active:scale-95 cursor-pointer block font-bold tracking-wider"
                  >
                    VIEW TEAM →
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-6 right-6 z-40">
        {userTeamCount >= 3 ? (
          <div
            title="You've reached the 3-team limit"
            className="bg-[#FAF5EA] text-on-surface-variant border-2 border-ink-black font-headline-sm text-sm px-6 py-3.5 shadow-tape transform -rotate-2 flex items-center gap-2 uppercase font-bold tracking-wider opacity-80 cursor-not-allowed"
          >
            <span>🔒</span>
            <span>3-TEAM LIMIT REACHED</span>
          </div>
        ) : (
          <Link
            to="/teams/new"
            className="bg-battle-red text-white border-2 border-ink-black font-headline-sm text-sm px-6 py-3.5 shadow-hard transform -rotate-2 hover:rotate-0 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2 uppercase font-bold tracking-wider"
          >
            <span>⚡</span>
            <span>CREATE A TEAM</span>
          </Link>
        )}
      </div>
    </div>
  )
}
